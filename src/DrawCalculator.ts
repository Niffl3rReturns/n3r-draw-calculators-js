import { BigNumber, ethers, utils } from "ethers";
import {Draw, DrawSettings, User} from "../types/types"


const printUtils = require("./helpers/printUtils")
const { dim, green, yellow } = printUtils


export function runDrawCalculatorForSingleDraw(drawSettings: DrawSettings, draw: Draw, user: User): BigNumber {
    
    const sanityCheckDrawSettingsResult = sanityCheckDrawSettings(drawSettings)
    
    if(sanityCheckDrawSettingsResult != ""){
        throw new Error(`DrawSettings invalid: ${sanityCheckDrawSettingsResult}`)
    }

    /* CALCULATE() */ //single winning number -> no loop required
    //  bytes32 userRandomNumber = keccak256(abi.encodePacked(user)); // hash the users address
    const userRandomNumber = ethers.utils.solidityKeccak256(["address"], [user.address])
    console.log("userRandomNumber: ", userRandomNumber)
    /* _CALCULATE()*/   
    const totalUserPicks = user.balance.div(drawSettings.pickCost) // uint256 totalUserPicks = balance / _drawSettings.pickCost;
    dim(`totalUserPicks ${totalUserPicks}`)

    let prizeAwardable: BigNumber = BigNumber.from(0)

    const defaultAbiCoder = ethers.utils.defaultAbiCoder

    const picksLength = user.pickIndices.length
    
    for(let i =0; i < picksLength; i++){ //for(uint256 index  = 0; index < picks.length; index++){
        
        if(user.pickIndices[i] > totalUserPicks){
            throw new Error(`User does not have this many picks!`)
        }

        const abiEncodedValue = utils.solidityPack(["bytes32","uint256"],[userRandomNumber,user. pickIndices[i]])
        const randomNumberThisPick = utils.keccak256(abiEncodedValue)

        console.log("randomNumberThisPick", randomNumberThisPick)
        prizeAwardable = prizeAwardable.add(calculatePickFraction(randomNumberThisPick, draw.winningRandomNumber, drawSettings, draw))  // prize += calculatePickFraction(randomNumberThisPick, winningRandomNumber, _drawSettings);
    }
    

    return prizeAwardable
}

//function calculatePickFraction(uint256 randomNumberThisPick, uint256 winningRandomNumber, DrawSettings memory _drawSettings)
export function calculatePickFraction(randomNumberThisPick: string, winningRandomNumber: BigNumber, _drawSettings: DrawSettings, draw: Draw): BigNumber {
    
    let numberOfMatches : number = 0;

    // for(uint256 matchIndex = 0; matchIndex < _matchCardinality; matchIndex++){
    for(let matchIndex = 0; matchIndex < _drawSettings.matchCardinality.toNumber(); matchIndex++){
        const _matchIndexOffset: number = matchIndex * _drawSettings.bitRangeSize.toNumber()
        
        console.log("winningRandomNumber: ", winningRandomNumber.toString())
        console.log("randomNumberThisPick: ", BigNumber.from(randomNumberThisPick).toString())
        
        if(findBitMatchesAtIndex(BigNumber.from(randomNumberThisPick), winningRandomNumber, BigNumber.from(_matchIndexOffset), _drawSettings.bitRangeValue)){
            green(`match at index ${matchIndex}`)
            numberOfMatches++;
        }
    }
    green(`\n found ${numberOfMatches} matches..`)
    const prizeAmount = calculatePrizeAmount(_drawSettings, draw, numberOfMatches)


    // console.log("prizeAmount ", utils.formatEther(prizeAmount))

    return prizeAmount
}


//function _findBitMatchesAtIndex(uint256 word1, uint256 word2, uint256 indexOffset, uint8 _bitRangeMaskValue) 
export function findBitMatchesAtIndex(word1: BigNumber, word2: BigNumber, indexOffset: BigNumber, bitRangeValue: BigNumber): boolean {

    const word1DataHexString: string = word1.toHexString()
    const word2DataHexString: string = word2.toHexString()
    
    console.log("word1DataHexString", word1DataHexString)
    console.log("word2DataHexString", word2DataHexString)

    console.log("bitRangeValue ", bitRangeValue.toString())
    console.log("indexOffset ", indexOffset.toString())

    const mask : BigInt = BigInt(bitRangeValue.toString()) << BigInt(indexOffset.toString())
    console.log("mask: ", mask)

    const bits1 = BigInt(word1DataHexString) & BigInt(mask)
    const bits2 = BigInt(word2DataHexString) & BigInt(mask)
    // console.log("attempting to match ", bits1.toString(), " with", bits2.toString())
    yellow(`matching ${bits1.toString()} with ${bits2.toString()}`)
    return bits1 == bits2
}


// calculates the absolute amount of Prize in Wei for the Draw and DrawSettings
export function calculatePrizeAmount(drawSettings: DrawSettings, draw: Draw, matches :number): BigNumber {
    
    const distributionIndex = drawSettings.matchCardinality.toNumber() - matches
    console.log("distributionIndex ", distributionIndex)

    if(distributionIndex > drawSettings.distributions.length){
       throw new Error(`There are only ${drawSettings.distributions.length} tiers of prizes`) // there is no "winning number" in this case
    }
    // now calculate the expected prize amount for these settings
    // totalPrize *  (distributions[index]/(range ^ index)) where index = matchCardinality - numberOfMatches
    const numberOfPrizes = Math.pow(drawSettings.bitRangeSize.toNumber(), distributionIndex)
    console.log("numberOfPrizes ", numberOfPrizes)
    
    const valueAtDistributionIndex : BigNumber = drawSettings.distributions[distributionIndex]
    console.log("valueAtDistributionIndex ", valueAtDistributionIndex)
    
    const fractionOfPrize: BigNumber= valueAtDistributionIndex.div(numberOfPrizes) //.div(100)

    console.log("fractionOfPrize: ", utils.formatEther(fractionOfPrize))
    
    const expectedPrizeAmount : BigNumber = (draw.prize).mul(fractionOfPrize)//.div(ethers.constants.WeiPerEther)

    console.log("expectedPrizeAmount ", utils.formatEther(expectedPrizeAmount))

    return expectedPrizeAmount
}

// inverse of calculatePrizeAmount()
export function calculateNumberOfMatchesForPrize(drawSettings: DrawSettings, draw: Draw, prizeReceived: BigNumber): number {
    
    const sanityResult = sanityCheckDrawSettings(drawSettings)
    
    if(sanityResult == ""){
        // const expectedPrizeAmount : BigNumber = (draw.prize).mul(percentageOfPrize).div(ethers.constants.WeiPerEther) 
        const fractionOfPrizeReceived: BigNumber = prizeReceived.div(draw.prize)
        console.log("fractionOfPrizeReceived: ", utils.formatEther(fractionOfPrizeReceived))

        for(let i = 0; i < drawSettings.distributions.length; i++){
            const numPrizes = BigNumber.from(Math.pow(drawSettings.bitRangeSize.toNumber(),i))
            const prizeFractionAtIndex = drawSettings.distributions[i].div(numPrizes)
            
            console.log(`prizeFractionAtIndex ${i} : ${utils.formatEther(prizeFractionAtIndex)}`)

            if(fractionOfPrizeReceived.eq(prizeFractionAtIndex)){
                
                return drawSettings.matchCardinality.toNumber() - (drawSettings.distributions.length - i - 1) //constdrawSettings.matchCardinality.toNumber() - distributionIndex = matches 
            }
            
        } 
    }

    // else there is no number of matches
    return 0;

}



export function sanityCheckDrawSettings(drawSettings: DrawSettings) : string {

    if(drawSettings.matchCardinality.gt(drawSettings.distributions.length)){
        console.log("DrawCalc/matchCardinality-gt-distributions")
        return "DrawCalc/matchCardinality-gt-distributions"
    }
    else if(!(drawSettings.bitRangeValue.toNumber() == (Math.pow(2, drawSettings.bitRangeSize.toNumber())-1))){
        return "DrawCalc/bitRangeValue-incorrect"
    }
    else if(drawSettings.bitRangeSize.gte(Math.floor((256 / drawSettings.matchCardinality.toNumber())))){
        return "DrawCalc/bitRangeSize-too-large"
    }
    else if(drawSettings.pickCost.lte(0)){
        return "DrawCalc/pick-gt-0"
    }
    else{
        let sum = BigNumber.from(0)
        for(let i = 0; i < drawSettings.distributions.length; i++){
            sum = sum.add(drawSettings.distributions[i])
        }
        if(sum.gte(ethers.utils.parseEther("1"))){
            return "DrawCalc/distributions-gt-100%"
        }
    }
    return ""
}