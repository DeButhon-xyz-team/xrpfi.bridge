// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title MockWBTC
 * @dev 8 decimals ERC20 for staking
 */
contract MockWBTC is ERC20, Ownable {
    constructor() ERC20("Wrapped BTC", "WBTC") {}
    function decimals() public pure override returns (uint8) { return 8; }
    function mint(address to, uint256 amount) public onlyOwner { _mint(to, amount); }
}

/**
 * @title AToken
 * @dev Yield-bearing token like aWBTC
 */
contract AToken is ERC20, Ownable {
    constructor() ERC20("aWBTC", "aWBTC") {}
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
    function burnFrom(address account, uint256 amount) external onlyOwner { _burn(account, amount); }
}

/**
 * @title XrpWbtcLendingSwap
 * @dev XRP -> WBTC 스왑 + WBTC 예치 + 이자 보상 → XRP로 지급 + 출금 기능
 */
contract XrpWbtcLendingSwap is Ownable {
    using SafeMath for uint256;

    MockWBTC public wbtc;
    AToken public aToken;

    // 가격: 8 decimals 기준
    uint256 public constant XRP_USD_PRICE = 340 * 10**6;      // $3.40
    uint256 public constant BTC_USD_PRICE = 85000 * 10**8;    // $85,000

    uint256 public interestRate = 500; // 5.00%
    uint256 public lastUpdate;
    uint256 public cumulativeIndex = 1e18;
    uint256 public totalDeposits;

    mapping(address => uint256) public userIndex;

    event SwappedAndStaked(address indexed user, uint256 xrpIn, uint256 wbtcAmount);
    event RewardClaimed(address indexed user, uint256 rewardWbtc, uint256 rewardXrp);
    event Withdrawn(address indexed user, uint256 wbtcAmount);
    event Funded(address indexed from, uint256 amount);

    constructor() {
        wbtc = new MockWBTC();
        aToken = new AToken();
        lastUpdate = block.timestamp;
    }

    receive() external payable { emit Funded(msg.sender, msg.value); }

    function updateIndex() public {
        if (block.timestamp == lastUpdate || totalDeposits == 0) return;

        uint256 delta = block.timestamp - lastUpdate;
        uint256 interest = delta.mul(interestRate).mul(totalDeposits).div(365 * 24 * 3600).div(10000);
        uint256 indexDelta = interest.mul(1e18).div(totalDeposits);
        cumulativeIndex = cumulativeIndex.add(indexDelta);
        lastUpdate = block.timestamp;
    }

    function swapAndStake() external payable {
        require(msg.value > 0, "Send XRP");
        updateIndex();

        uint256 xrpBtc = (XRP_USD_PRICE * 1e18) / BTC_USD_PRICE;
        uint256 wbtcRaw = (msg.value * xrpBtc) / 1e18;
        uint256 wbtcAmount = wbtcRaw / (10 ** (18 - wbtc.decimals()));

        wbtc.mint(address(this), wbtcAmount);
        aToken.mint(msg.sender, wbtcAmount);

        userIndex[msg.sender] = cumulativeIndex;
        totalDeposits = totalDeposits.add(wbtcAmount);

        emit SwappedAndStaked(msg.sender, msg.value, wbtcAmount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(aToken.balanceOf(msg.sender) >= amount, "Not enough aWBTC");

        updateIndex();
        aToken.burnFrom(msg.sender, amount);

        require(wbtc.transfer(msg.sender, amount), "WBTC transfer failed");

        totalDeposits = totalDeposits.sub(amount);
        userIndex[msg.sender] = cumulativeIndex;

        emit Withdrawn(msg.sender, amount);
    }

    function calculateReward(address user) public view returns (uint256 rewardWbtc, uint256 rewardXrp) {
        uint256 balance = aToken.balanceOf(user);
        if (balance == 0) return (0, 0);

        uint256 _index = cumulativeIndex;
        if (block.timestamp > lastUpdate && totalDeposits > 0) {
            uint256 delta = block.timestamp - lastUpdate;
            uint256 interest = delta.mul(interestRate).mul(totalDeposits).div(365 * 24 * 3600).div(10000);
            uint256 indexDelta = interest.mul(1e18).div(totalDeposits);
            _index = _index.add(indexDelta);
        }

        uint256 reward = balance.mul(_index.sub(userIndex[user])).div(1e18);
        rewardWbtc = reward;
        rewardXrp = rewardWbtc.mul(BTC_USD_PRICE).div(XRP_USD_PRICE).mul(10 ** (18 - wbtc.decimals()));
    }

    function claimReward() external {
        updateIndex();
        (uint256 rewardWbtc, uint256 rewardXrp) = calculateReward(msg.sender);
        require(rewardXrp > 0, "No rewards");
        require(address(this).balance >= rewardXrp, "Not enough XRP");

        userIndex[msg.sender] = cumulativeIndex;

        (bool success, ) = payable(msg.sender).call{value: rewardXrp}("");
        require(success, "XRP transfer failed");

        emit RewardClaimed(msg.sender, rewardWbtc, rewardXrp);
    }

    function getWbtcAddress() external view returns (address) {
        return address(wbtc);
    }

    function getATokenAddress() external view returns (address) {
        return address(aToken);
    }

    function getLiquidity() external view returns (uint256) {
        return address(this).balance;
    }
}
