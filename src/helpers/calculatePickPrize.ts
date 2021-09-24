import { BigNumber, utils } from "ethers"
import { TsunamiDrawSettings, Draw, PickPrize } from "../types"
import { calculatePrizeAmount } from "./calculatePrizeAmount"
import { findBitMatchesAtIndex } from "./findBitMatchesAtIndex"

const debug = require('debug')('pt:tsunami-sdk-drawCalculator')

// returns the fraction of the total prize that the user will win for this pick
export function calculatePickPrize(randomNumberThisPick: string, winningRandomNumber: BigNumber, _drawSettings: TsunamiDrawSettings, draw: Draw): PickPrize | undefined {
    
    let numberOfMatches = 0
    let bigRando = BigNumber.from(randomNumberThisPick)

    for(let matchIndex = 0; matchIndex < _drawSettings.matchCardinality; matchIndex++){ 
        
        debug("winningRandomNumber: ", winningRandomNumber.toString())
        debug("randomNumberThisPick: ", bigRando.toString())
        // attempt to match numbers
        if(!findBitMatchesAtIndex(bigRando, winningRandomNumber, matchIndex, _drawSettings.bitRangeSize)){
            // no more continuous matches -- break out of matching loop
            break
        } 
        numberOfMatches++;
    }
    debug(`\n DrawCalculator:: Found ${numberOfMatches} matches..`)
    
    const pickAmount = calculatePrizeAmount(_drawSettings, draw, numberOfMatches)
    
    if(pickAmount){
        debug(`user is receiving a prize! ${utils.formatEther(pickAmount.amount)}`)
        return pickAmount
    }
    // else there is no prize   
    return undefined
}