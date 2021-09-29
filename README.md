# PoolTogether Draw Calculator JS

[![npm version](https://badge.fury.io/js/@pooltogether%2Fdraw-calculator-js.svg)](https://badge.fury.io/js/@pooltogether%2Fdraw-calculator-js)
[![TypeScript definitions on DefinitelyTyped](https://definitelytyped.org/badges/standard.svg)](https://definitelytyped.org)

This library includes a stateless Typescript model of the Solidity DrawCalculator. It is intended to be uses as a tool to easily check if a User has won a prize for a particular draw. This could also be calculated on-chain through the `DrawCalculator::calculate()` view function but this library is much faster.

## How to use
To create a claim or calculate winnings for an address:
1. Run `yarn add @pooltogether/draw-calculator-js` in your project to install the package.
1. Import the desired functions and types: `import {runDrawCalculator, Draw, PrizeDistribution, generatePicks, prepareClaims } from "@pooltogether/draw-calculator-js"`

Starting with a particular `drawId` and `userAddress`, fetch the Draw information from the DrawHistory contract:

```js
const drawHistory: Contract = new ethers.Contract(address, drawHistoryAbi, signerOrProvider)
const drawId: number = await drawHistory.getNewestDraw() // can go back cardinality in time (8 draws)
const draw: Draw = await drawHistory.functions.getDraw(drawId) // read-only rpc call
```

Next fetch the PrizeDistribution for the drawId from the PrizeDistributionHistory contract:

```javascript
// get PrizeDistribution from the  DrawCalculatorHistory contract for a particular drawId
const prizeDistributionHistoryContract: Contract = new ethers.Contract(address, drawSettingHistoryAbi, signerOrProvider)
const prizeDistribution = await prizeDistributionHistoryContract.functions.getPrizeDistribution(drawId) // read-only rpc call
```

Next, get the users balance using the convenient `getNormalizedBalancesForDrawIds(address _user, uint32[] calldata _drawIds)` view method
on the DrawCalculator contract which returns an array of balances for those timestamps.

```js
const drawCalculator: Contract = new ethers.Contract(address, drawCalculatorAbi, signerOrProvider)
const balance = await drawCalculator.functions.getNormalizedBalancesForDrawIds(userAddress, [drawId]) // read-only rpc call
```

Run this `draw-calculator-js` library locally to see the user has any prizes to claim:
```js
const exampleUser: User = {
    address: userAddress // user address we want to calculate for
    normalizedBalances: [balance]
}

const results: DrawResults = runDrawCalculator(prizeDistribution, draw, exampleUser)
```

Finally, to claim a prize, forward these `DrawResults` to `prepareClaims(user: User, drawResult: DrawResults[])` to generate the data for the on-chain ClaimableDraw `claim()` call:

```js
const claim: Claim = prepareClaimForUserFromDrawResult(user, [result])
```

The on-chain call to `ClaimableDraw::claim(address _user, uint32[] calldata _drawIds, bytes calldata _data)` can then be populated and called with this data:

```js
const claimableDrawContract = new ethers.Contract(address, claimableDrawAbi, signerOrProvider)
await claimableDrawContract.functions.claim(claim.userAddress, claim.drawIds, claim.data) //write rpc call

```

Congratulations you have now claimed a prize!

## API Guide
todo.
## Types
A full breakdown of the types can be found [here](./src/types.ts)

