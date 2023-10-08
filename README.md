# N3R Draw Calculator Utils

This library includes a stateless Typescript model of the Solidity DrawCalculator. It is intended to be uses as a tool to easily check if a User has won a prize for a particular draw. This could also be calculated on-chain through the `DrawCalculator::calculate()` view function but this library is much faster.

## How to use?

To create a claim or calculate winnings for an address:

Starting with a particular `drawId` and `userAddress`, fetch the Draw information from the DrawBuffer contract:

```js
const drawBuffer: Contract = new ethers.Contract(address, drawBufferAbi, signerOrProvider);
const drawId: number = await drawBuffer.getNewestDraw(); // can go back cardinality in time (8 draws)
const draw: Draw = await drawBuffer.functions.getDraw(drawId); // read-only rpc call
```

Next fetch the PrizeDistribution for the `drawId` from the PrizeDistributionBuffer contract:

```javascript
// get PrizeDistribution from the  DrawCalculatorHistory contract for a particular drawId
const PrizeDistributionBufferContract: Contract = new ethers.Contract(
    address,
    prizeDistributionAbi,
    signerOrProvider,
);
const prizeDistribution = await PrizeDistributionBufferContract.functions.getPrizeDistribution(
    drawId,
); // read-only rpc call
```

Next, get the users balance using the convenient `getNormalizedBalancesForDrawIds(address _user, uint32[] calldata _drawIds)` view method
on the DrawCalculator contract which returns an array of balances for drawIds:

```js
const drawCalculator: Contract = new ethers.Contract(address, drawCalculatorAbi, signerOrProvider);
const balances = await drawCalculator.functions.getNormalizedBalancesForDrawIds(userAddress, [
    drawId,
]); // read-only rpc call
```

Run this `draw-calculator-js` library locally to see the user has any prizes to claim:

```js
const exampleUser: User = {
    address: userAddress // user address we want to calculate for
    normalizedBalances: balances
}

let results: DrawResults = batchCalculateDrawResults([prizeDistribution], [draw], exampleUser)
```

The `results.totalValue` field should indicate the total amount of prize available for `userAddress` for the `drawId`.

These results may then need to be filtered by value, since the user can only claim `prizeDistribution.maxPicksPerUser` number of prizes per draw.

```js
results = filterResultsByValue(results, prizeDistribution.maxPicksPerUser);
```

Finally, to claim a prize, forward these `DrawResults` to `prepareClaims(user: User, drawResult: DrawResults[])` to generate the data for the on-chain PrizeDistributor `claim()` call:

```js
const claim: Claim = prepareClaims(user, [results]);
```

The on-chain call to `PrizeDistributor::claim(address _user, uint32[] calldata _drawIds, bytes calldata _data)` can then be populated and called with this data:

```js
const PrizeDistributorContract = new ethers.Contract(
    address,
    PrizeDistributorAbi,
    signerOrProvider,
);
await PrizeDistributorContract.functions.claim(
    claim.userAddress,
    claim.drawIds,
    claim.encodedWinningPickIndices,
);
```
