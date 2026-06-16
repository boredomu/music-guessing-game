import { useState, useRef } from "react";
import EndScreen from "./EndScreen";
import { artistKey, trackKey, albumKey, trackIdKey } from "../modules/Variables";

interface GuessHandlerArguments
{
    result: any,
    currentTrack: React.RefObject<{
        artist: string,
        track: string,
        album: string,
        track_id: string
    }>,
    guessesRemaining: number,
    updateGuessesRemaining: React.Dispatch<React.SetStateAction<number>>, 
    wrongGuesses: string[],
    updateWrongGuesses: React.Dispatch<React.SetStateAction<string[]>>,
    updateRoundResult: React.Dispatch<React.SetStateAction<boolean>>
}

// Constants
const noWidth = 0;
const noHeight = 0;
const defaultToZero = 0;
const typedGuessIndex = 1;
const increment = 1;
const decrement = 1;
const oneGuessLeft = 1;
const oneElement = 1;
const firstElement = 1;
const singleSpaceAscii = 32;
const openBracketAscii = 40;
const closedBracketAscii = 41;
const digitAsciiLow = 48;
const digitAsciiHigh = 57;
const uppercaseAsciiLow = 65;
const uppercaseAsciiHigh = 90;
const lowercaseAsciiLow = 97;
const lowercaseAsciiHigh = 122;
const emptyString = "";
const wrongGuessString = "❌ ";
const jsonFile = "https://raw.githubusercontent.com/boredomu/boredle/refs/heads/main/Heardle%20Data%20-%20JSON.json";
const playImage = "https://raw.githubusercontent.com/boredomu/boredle/refs/heads/main/public/play.png";
const pauseImage = "https://raw.githubusercontent.com/boredomu/boredle/refs/heads/main/public/pause.png";
const volumeWarningString = "WARNING: This is EXTREMELY LOUD, so adjust your browser volume";
const replacedByEmbedId = "replacedByEmbed";
const playbackButtonId = "playbackButton";
const trackUriString = "spotify:track:";
const clickEventName = "click";
const playbackUpdateEventName = "playback_update";
const dataReadyEventName = "dataReadyEvent";
const deleteEmbedEventName = "deleteEmbedEvent";
const dataReadyEvent = new CustomEvent(dataReadyEventName);
const deleteEmbedEvent = new CustomEvent(deleteEmbedEventName);
const defaultTrackObject = {
    artist: emptyString,
    track: emptyString,
    album: emptyString,
    track_id: emptyString
};

// Variable declarations
let trackList = [defaultTrackObject];

// Local dictionary keys
const dataKey = "data";
const isPausedKey = "isPaused";
const trackPositionKey = "position";
const trackDurationKey = "duration";

// React hook related
const startingGuesses = 6;
const currentlyPlaying = true;
const endOfRound = false;
const roundLost = false;
const roundWon = true;
const notVisible = "none";
const visible = "inline";
const defaultWrongGuessesList = homogeneousList(emptyString, startingGuesses);

// Create a list with a specific length that contains a given element
function homogeneousList(repeatedElement: any, length: number)
{
    let returnedList = [repeatedElement];
    let numberOfElements = oneElement;
    while(numberOfElements < length)
    {
        returnedList.push(repeatedElement);
        numberOfElements += increment;
    }

    return(returnedList);
}

// Returns strings that account for variance in user input
function filterString(givenString: string)
{
    givenString = givenString.toLowerCase().trim();

    let returnedString = "";
    let charIndex = firstElement;
    let isBracketString = false;
    let currentCharAscii = defaultToZero;
    let previousCharAscii = defaultToZero;
    while(charIndex < givenString.length)
    {
        if(charIndex > firstElement)
        {
            previousCharAscii = currentCharAscii;
        }
        currentCharAscii = givenString.charCodeAt(charIndex);
        
        // Filter out bracket strings
        if(currentCharAscii == openBracketAscii || isBracketString)
        {
            if(currentCharAscii == openBracketAscii)
            {
                isBracketString = true;
            }
            else if(currentCharAscii == closedBracketAscii)
            {
                isBracketString = false;
                charIndex += increment;
            }
        }
        // Filter out anything that isn't a space, number or letter
        else if(!isBracketString)
        {
            let isSingleSpace = currentCharAscii == singleSpaceAscii && currentCharAscii != previousCharAscii;
            let isDigit = currentCharAscii >= digitAsciiLow && currentCharAscii <= digitAsciiHigh;
            let isUppercaseLetter = currentCharAscii >= uppercaseAsciiLow && currentCharAscii <= uppercaseAsciiHigh;
            let isLowercaseLetter = currentCharAscii >= lowercaseAsciiLow && currentCharAscii <= lowercaseAsciiHigh;

            if(isSingleSpace || isDigit || isUppercaseLetter || isLowercaseLetter)
            {
                let currentChar = givenString.charAt(charIndex);
                returnedString += currentChar;
            }  
        }

        charIndex += increment;
    }

    returnedString = returnedString.trim();
    return(returnedString);
}

// End a round
function endRound()
{
    document.dispatchEvent(deleteEmbedEvent);
}

// Handles guess logic
function guessHandler({result, currentTrack, guessesRemaining, updateGuessesRemaining, wrongGuesses, updateWrongGuesses, updateRoundResult}: GuessHandlerArguments)
{
    result.preventDefault();
    updateGuessesRemaining(guessesRemaining - decrement);

    const userGuess = result.target[typedGuessIndex].value;
    const trackName = filterString(currentTrack.current[trackKey]);
    const correctGuess = filterString(userGuess) == trackName;
    const noGuessesLeft = guessesRemaining == oneGuessLeft;
    if(correctGuess || noGuessesLeft)
    {
        if(correctGuess)
        {
            updateRoundResult(roundWon);
        }

        endRound();
    }
    else
    {
        result.target.reset();

        const updatedState = wrongGuesses;
        wrongGuesses[startingGuesses - guessesRemaining] = userGuess;
        updateWrongGuesses(updatedState);
    }
}

function MainScreen()
{
    // States
    const [gameState, updateGameState] = useState(currentlyPlaying);
    const [guessesRemaining, updateGuessesRemaining] = useState(startingGuesses);
    const [roundResult, updateRoundResult] = useState(roundLost);
    const [playbackButtonVisibility, updatePlaybackButtonVisibility] = useState(notVisible);
    const [playbackButtonImage, updatePlaybackButtonImage] = useState(playImage)
    const [wrongGuesses, updateWrongGuesses] = useState(defaultWrongGuessesList);
    const currentTrack = useRef(defaultTrackObject);

    // Inline CSS objects
    let inlineDisplay = {
        display: playbackButtonVisibility
    };
    let inlineBackgroundImage = {
        backgroundImage: `url(${playbackButtonImage})`
    };

    (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
        // response.json() returns another promise object
        fetch(jsonFile).then(response =>
            response.json().then(data => {
                trackList = data;
                document.dispatchEvent(dataReadyEvent);
        }))

        // Wait for the JSON file before picking the track
        document.addEventListener(dataReadyEventName, () => {
            const numberOfTracks = trackList.length;
            const randomIndex = Math.floor(Math.random() * numberOfTracks);
            const randomTrack = trackList[randomIndex];
            const randomTrackId = randomTrack[trackIdKey];
            currentTrack.current = {
                artist: randomTrack[artistKey],
                track: randomTrack[trackKey],
                album: randomTrack[albumKey],
                track_id: randomTrackId
            };

            const element = document.getElementById(replacedByEmbedId); 
            const options = {
                width: noWidth,
                height: noHeight,
                uri: trackUriString + randomTrackId
            };
            const callback = (EmbedController: any) => {
                document.addEventListener(deleteEmbedEventName, () => {
                    EmbedController.destroy();
                    updateGameState(endOfRound);
                })

                const playbackButton = document.getElementById(playbackButtonId);
                if(playbackButton)
                {
                    playbackButton.addEventListener(clickEventName, () => {
                        EmbedController.togglePlay();
                    });

                    EmbedController.addListener(playbackUpdateEventName, (spotifyReturnedObject: any) => {
                        const returnedObjectData = spotifyReturnedObject[dataKey]
                        const isPaused = returnedObjectData[isPausedKey];
                        const trackPosition = returnedObjectData[trackPositionKey];
                        const trackDuration = returnedObjectData[trackDurationKey];
                        if(isPaused || trackPosition == trackDuration)
                        {
                            updatePlaybackButtonImage(playImage);
                        }
                        else
                        {
                            updatePlaybackButtonImage(pauseImage);
                        }
                    })
                }
            };

            IFrameAPI.createController(element, options, callback);
            updatePlaybackButtonVisibility(visible);
        })
    }

    return(
        <div>
            <span id={replacedByEmbedId}></span>
            <h1 className="header centered">Boredle</h1>
            {
                gameState
                ?   
                    <>
                        <h3 className="red-text centered">{volumeWarningString}</h3>
                        <div className="dark-background padding spacing">
                            <div className="max-width">
                                <table className="auto-margin large-width centered">
                                    <tbody>
                                        {
                                            wrongGuesses.map((currentGuess: string, guessIndex: number) => {
                                                return(
                                                    <tr>
                                                        <td className="wrong-guess-row">{guessIndex < (startingGuesses - guessesRemaining) && wrongGuessString}{currentGuess}</td>
                                                    </tr>
                                                )
                                            })
                                        }
                                    </tbody>
                                </table>
                            </div>
                            <input id={playbackButtonId} className="spacing" type="button" style={{...inlineDisplay, ...inlineBackgroundImage}}></input>
                            <form className="spacing" onSubmit={(result) => {guessHandler({result, currentTrack, guessesRemaining, updateGuessesRemaining, wrongGuesses, updateWrongGuesses, updateRoundResult})}}>
                                <input id="giveUp" className="fancy-button blue-background" type="button" onClick={endRound} value="Give Up"></input>
                                <input id="typedGuess" type="text" placeholder="Guess the track..." autoComplete="off"></input>
                                <input id="submitGuess" className="fancy-button grey-background" type="submit" value="Guess"></input>
                            </form>
                        </div>
                    </>
                :
                    <EndScreen currentTrack={currentTrack.current} roundResult={roundResult}></EndScreen>
            }
        </div>
    )
}

export default MainScreen