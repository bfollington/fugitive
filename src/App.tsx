import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import GridGame from "./grid-escape-game";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <GridGame />
      </div>
    </>
  );
}

export default App;
