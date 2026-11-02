import { GameState } from "./types";

// A ready-to-play board so you can start a game immediately.
// Everything here is editable in the app (Edit button) and saved in your browser.
export const SAMPLE_GAME: GameState = {
  title: "Leopardy!",
  activeRound: 0,
  phase: "setup",
  history: [],
  players: [
    { id: "p1", name: "Player 1", score: 0, color: "#f5c531" },
    { id: "p2", name: "Player 2", score: 0, color: "#3ca0ea" },
    { id: "p3", name: "Player 3", score: 0, color: "#ec5aa6" },
  ],
  rounds: [
    {
      id: "r-j",
      name: "Leopardy!",
      categories: [
    {
      id: "c1",
      name: "World Capitals",
      clues: [
        { id: "c1-1", value: 200, clue: "This city of light is the capital of France.", answer: "What is Paris?", done: false },
        { id: "c1-2", value: 400, clue: "The capital of Japan, formerly known as Edo.", answer: "What is Tokyo?", done: false },
        { id: "c1-3", value: 600, clue: "This Australian capital was purpose-built between Sydney and Melbourne.", answer: "What is Canberra?", done: false },
        { id: "c1-4", value: 800, clue: "The capital of Canada, on the river of the same name.", answer: "What is Ottawa?", done: false },
        { id: "c1-5", value: 1000, clue: "This capital of Kazakhstan was renamed Nur-Sultan, then back again.", answer: "What is Astana?", done: false },
      ],
    },
    {
      id: "c2",
      name: "Science",
      clues: [
        { id: "c2-1", value: 200, clue: "This gas, with symbol O, makes up about 21% of Earth's atmosphere.", answer: "What is oxygen?", done: false },
        { id: "c2-2", value: 400, clue: "The powerhouse of the cell.", answer: "What is the mitochondrion?", done: false },
        { id: "c2-3", value: 600, clue: "This force keeps planets in orbit around the Sun.", answer: "What is gravity?", done: false },
        { id: "c2-4", value: 800, clue: "The speed of this is roughly 299,792 km per second in a vacuum.", answer: "What is light?", done: false },
        { id: "c2-5", value: 1000, clue: "This element with atomic number 79 has the symbol Au.", answer: "What is gold?", done: false },
      ],
    },
    {
      id: "c3",
      name: "Movies",
      clues: [
        { id: "c3-1", value: 200, clue: "In this 1997 film, Jack and Rose fall in love aboard a doomed ship.", answer: "What is Titanic?", done: false },
        { id: "c3-2", value: 400, clue: "This green ogre lives in a swamp and befriends a talkative donkey.", answer: "What is Shrek?", done: false },
        { id: "c3-3", value: 600, clue: "Director of 'Jaws', 'E.T.', and 'Jurassic Park'.", answer: "Who is Steven Spielberg?", done: false },
        { id: "c3-4", value: 800, clue: "This 2010 Christopher Nolan film involves dreams within dreams.", answer: "What is Inception?", done: false },
        { id: "c3-5", value: 1000, clue: "This 1942 film set in Morocco gave us the line 'Here's looking at you, kid.'", answer: "What is Casablanca?", done: false },
      ],
    },
    {
      id: "c4",
      name: "Sports",
      clues: [
        { id: "c4-1", value: 200, clue: "This sport is played at Wimbledon.", answer: "What is tennis?", done: false },
        { id: "c4-2", value: 400, clue: "Number of players on a standard soccer team on the field.", answer: "What is eleven?", done: false },
        { id: "c4-3", value: 600, clue: "This basketball legend wore number 23 for the Chicago Bulls.", answer: "Who is Michael Jordan?", done: false },
        { id: "c4-4", value: 800, clue: "Held every four years, these games feature a flame and five rings.", answer: "What are the Olympics?", done: false },
        { id: "c4-5", value: 1000, clue: "In cricket, this term describes three wickets taken on consecutive balls.", answer: "What is a hat-trick?", done: false },
      ],
    },
    {
      id: "c5",
      name: "History",
      clues: [
        { id: "c5-1", value: 200, clue: "This wall fell in 1989, reuniting a divided city.", answer: "What is the Berlin Wall?", done: false },
        { id: "c5-2", value: 400, clue: "She was the first and only female Prime Minister of the UK in the 20th century.", answer: "Who is Margaret Thatcher?", done: false },
        { id: "c5-3", value: 600, clue: "This ancient wonder still standing was built as a tomb at Giza.", answer: "What is the Great Pyramid?", done: false },
        { id: "c5-4", value: 800, clue: "This document, signed in 1215, limited the power of the English king.", answer: "What is the Magna Carta?", done: false },
        { id: "c5-5", value: 1000, clue: "This explorer's crew completed the first circumnavigation of the globe in 1522.", answer: "Who is Magellan?", done: false },
      ],
    },
    {
      id: "c6",
      name: "Potpourri",
      clues: [
        { id: "c6-1", value: 200, clue: "There are this many days in a leap year.", answer: "What is 366?", done: false },
        { id: "c6-2", value: 400, clue: "This hot beverage comes in green, black, and oolong varieties.", answer: "What is tea?", done: false },
        { id: "c6-3", value: 600, clue: "This planet is known as the Red Planet.", answer: "What is Mars?", done: false },
        { id: "c6-4", value: 800, clue: "This currency is used across most of the European Union.", answer: "What is the euro?", done: false },
        { id: "c6-5", value: 1000, clue: "This Italian city is famous for its canals and gondolas.", answer: "What is Venice?", done: false },
      ],
    },
      ],
    },
  ],
  final: {
    category: "Famous Authors",
    clue: "This English playwright, born in 1564 in Stratford-upon-Avon, wrote 'Hamlet' and 'Romeo and Juliet'.",
    answer: "Who is William Shakespeare?",
    value: 2500,
    done: false,
  },
};
