import React, { useState, useEffect } from "react";
import AnimatedSprite from "./AnimatedSprite";

const GridGame = () => {
  const GRID_SIZE = 12;
  const CELL_SIZE = 32;
  const NUM_GUARDS = 3;

  const TILES = {
    EMPTY: { emoji: "", effect: null },
    PLAYER: { emoji: "🏃", effect: null },
    GUARD: { emoji: "💂", effect: "capture" },
    QUICKSAND: { emoji: "🕸️", effect: "stop" },
    WOLF: { emoji: "🐺", effect: "attack_adjacent" },
    ROCK: { emoji: "🪨", effect: "block" },
    CAVE: { emoji: "🕳️", effect: "teleport" },
    BROWN_MUSHROOM: { emoji: "🍄", effect: "heal" },
    RED_MUSHROOM: { emoji: "🔴", effect: "damage" },
    BUSH: { emoji: "🌳", effect: "hide" },
    RIVER: { emoji: "💧", effect: "flow" },
  };

  const [playerPos, setPlayerPos] = useState({
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
  });
  const [guards, setGuards] = useState([] as { x: number; y: number }[]);
  const [grid, setGrid] = useState(
    Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill("EMPTY")),
  );
  const [movesLeft, setMovesLeft] = useState(0);
  const [health, setHealth] = useState(100);
  const [isHidden, setIsHidden] = useState(false);
  const [actionLog, setActionLog] = useState(
    [] as { text: string; time: string }[],
  );
  const [seed, setSeed] = useState("1234");
  const [gameOver, setGameOver] = useState(false);
  const [isTeleporting, setIsTeleporting] = useState(false);

  const moveGuards = () => {
    if (isHidden) return;

    setGuards((prevGuards) => {
      const newGuards = prevGuards
        .map((guard) => {
          const dy = Math.sign(playerPos.y - guard.y);
          const newX = guard.x + 1;
          let newY = guard.y;

          if (dy !== 0 && grid[guard.y + dy][guard.x] !== "ROCK") {
            newY = guard.y + dy;
          }

          if (newY < 0 || newY >= GRID_SIZE) {
            return guard;
          }

          // Check if would move into player's position
          if (newX === playerPos.x && newY === playerPos.y) {
            return guard; // Stay in place if would move into player
          }

          if (grid[newY][newX] === "ROCK") {
            return guard;
          }

          return { x: newX, y: newY };
        })
        .filter((guard) => guard.x < GRID_SIZE);

      while (newGuards.length < NUM_GUARDS) {
        const newGuard = {
          x: Math.floor(Math.random() * 3),
          y: Math.floor(Math.random() * GRID_SIZE),
        };

        if (
          grid[newGuard.y][newGuard.x] !== "ROCK" &&
          !(newGuard.x === playerPos.x && newGuard.y === playerPos.y)
        ) {
          newGuards.push(newGuard);
        }
      }

      return newGuards;
    });

    checkGuardCapture(playerPos);
  };

  const movePlayer = React.useCallback(
    (dx: number, dy: number) => {
      if (gameOver || movesLeft <= 0) {
        addLog("❌ No moves left!");
        return;
      }

      const newX = playerPos.x + dx;
      const newY = playerPos.y + dy;

      if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
        addLog("❌ Can't move out of bounds!");
        return;
      }

      if (grid[newY][newX] === "ROCK") {
        addLog("🪨 Blocked by rock!");
        return;
      }

      setPlayerPos({ x: newX, y: newY });
      setMovesLeft((prev) => prev - 1);
      setIsHidden(false);
      addLog(`🏃 Moved to ${newX},${newY}`);

      handleTileEffect(newX, newY);
      checkWolfAttack({ x: newX, y: newY });

      moveGuards();

      checkGuardCapture({ x: newX, y: newY });
    },
    [movesLeft, playerPos, grid, guards, gameOver],
  );

  const checkGuardCapture = (pos: { x: number; y: number }) => {
    const attackingGuards = guards.filter(
      (guard) =>
        Math.abs(guard.x - pos.x) <= 1 && Math.abs(guard.y - pos.y) <= 1,
    );

    if (attackingGuards.length > 0) {
      const damage = attackingGuards.length * 25;
      setHealth((prev) => {
        const newHealth = Math.max(0, prev - damage);
        if (newHealth === 0) {
          setGameOver(true);
          addLog("💀 Defeated by guards! Game Over!");
        } else {
          addLog(`💂 Guards deal ${damage} damage!`);
        }
        return newHealth;
      });
    }
  };

  const addLog = (message: string) => {
    setActionLog((prev) =>
      [{ text: message, time: new Date().toLocaleTimeString() }, ...prev].slice(
        0,
        8,
      ),
    );
  };

  const handleKeyPress = React.useCallback(
    (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          movePlayer(1, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case "ArrowDown":
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case "r":
        case "R":
          e.preventDefault();
          rollDice();
          break;
      }
    },
    [movePlayer, gameOver],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    initializeGrid();
  }, []);

  const checkWolfAttack = (pos: { x: number; y: number }) => {
    let wolfDamage = 0;
    // Only check orthogonal directions
    const directions = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];

    for (const [dx, dy] of directions) {
      const x = pos.x + dx;
      const y = pos.y + dy;

      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;

      if (grid[y][x] === "WOLF") {
        wolfDamage += 15;
        addLog(`🐺 Wolf attacks from ${x},${y}!`);
      }
    }

    if (wolfDamage > 0) {
      setHealth((prev) => {
        const newHealth = Math.max(0, prev - wolfDamage);
        if (newHealth === 0) {
          setGameOver(true);
          addLog("💀 Killed by wolves! Game Over!");
        }
        return newHealth;
      });
    }
  };

  const handleTileEffect = (x: number, y: number) => {
    const tile = grid[y][x];
    switch (tile) {
      case "QUICKSAND":
        setMovesLeft(0);
        addLog("🕸️ Caught in web!");
        break;
      case "CAVE": {
        const exit = findCaveExit(x, y);
        if (exit) {
          setIsTeleporting(true);
          setPlayerPos(exit);
          addLog(`🕳️ Teleported to cave at ${exit.x},${exit.y}!`);
          setTimeout(() => setIsTeleporting(false), 200);
        }
        break;
      }
      case "BROWN_MUSHROOM":
        setHealth((prev) => Math.min(100, prev + 20));
        addLog("🍄 Healed by mushroom!");
        setGrid((prev) => {
          const newGrid = [...prev];
          newGrid[y][x] = "EMPTY";
          return newGrid;
        });
        break;
      case "RED_MUSHROOM":
        setHealth((prev) => {
          const newHealth = Math.max(0, prev - 20);
          if (newHealth === 0) {
            setGameOver(true);
            addLog("💀 Poisoned! Game Over!");
          }
          return newHealth;
        });
        addLog("🔴 Hurt by mushroom!");
        setGrid((prev) => {
          const newGrid = [...prev];
          newGrid[y][x] = "EMPTY";
          return newGrid;
        });
        break;
      case "BUSH":
        setIsHidden(true);
        addLog("🌳 Hidden in bush!");
        break;
      case "RIVER": {
        // Get the direction the player moved into the river from
        const dx = x - playerPos.x; // Previous position to current
        const dy = y - playerPos.y;

        // Find the next non-river tile in that direction
        let newX = x;
        let newY = y;

        while (true) {
          const nextX = newX + dx;
          const nextY = newY + dy;

          // Check bounds
          if (
            nextX < 0 ||
            nextX >= GRID_SIZE ||
            nextY < 0 ||
            nextY >= GRID_SIZE
          ) {
            break;
          }

          // Stop if we hit something that's not a river
          if (grid[nextY][nextX] !== "RIVER") {
            // If we hit a rock, stay before it
            if (grid[nextY][nextX] === "ROCK") {
              break;
            }
            // Otherwise, move to the tile after the river
            newX = nextX;
            newY = nextY;
            break;
          }

          newX = nextX;
          newY = nextY;
        }

        // Only move if the position actually changed
        if (newX !== x || newY !== y) {
          setPlayerPos({ x: newX, y: newY });
          addLog("💧 Swept through the river!");
          // Handle any effects at the new position
          handleTileEffect(newX, newY);
        }
        break;
      }
    }
  };

  const [turnCount, setTurnCount] = useState(0);
  const [totalOffset, setTotalOffset] = useState(0);

  const generateNewTile = () => {
    const rand = Math.random();
    if (rand < 0.1) return "QUICKSAND";
    else if (rand < 0.15) return "WOLF";
    else if (rand < 0.2) return "ROCK";
    else if (rand < 0.25) return "CAVE";
    else if (rand < 0.3) return "BROWN_MUSHROOM";
    else if (rand < 0.35) return "RED_MUSHROOM";
    else if (rand < 0.4) return "BUSH";
    else if (rand < 0.45) return "RIVER";
    else return "EMPTY";
  };

  const shiftGridLeft = () => {
    const shifter = (prev: string[][]) => {
      // Create a new grid with all columns shifted left
      const newGrid = prev.map((row) => {
        const shiftedRow = [...row.slice(1)];
        // Generate new tile for each row independently
        shiftedRow.push(generateNewTile());
        return shiftedRow;
      });
      return newGrid;
    };

    // Check if player would fall off
    if (playerPos.x === 0) {
      setGameOver(true);
      addLog("💀 Fell off the edge! Game Over!");
      return;
    }

    setTotalOffset((prev) => prev + 1);
    setPlayerPos((prev) => ({ ...prev, x: prev.x - 1 }));
    setGuards((prev) =>
      prev
        .filter((guard) => guard.x > 0)
        .map((guard) => ({ ...guard, x: guard.x - 1 })),
    );
    setGrid(shifter);
    addLog("⬅️ The world shifts left...");
  };

  const rollDice = () => {
    if (gameOver) return;

    shiftGridLeft(); // Shift first, to ensure proper game over check

    if (!gameOver) {
      // Only continue if we haven't fallen off the edge
      const roll = Math.floor(Math.random() * 6) + 1;
      setMovesLeft(roll);
      setTurnCount((prev) => prev + 1);
      addLog(`🎲 Rolled a ${roll}`);
    }
  };

  const spawnGuards = (currentGrid: string[][]) => {
    const newGuards = [];

    for (let i = 0; i < NUM_GUARDS; i++) {
      let x, y;
      let attempts = 0;
      do {
        x = Math.floor(Math.random() * 3); // Spawn in first 3 columns
        y = Math.floor(Math.random() * GRID_SIZE);
        attempts++;
        if (attempts > 100) break;
      } while (currentGrid[y][x] === "ROCK");

      if (attempts <= 100) {
        newGuards.push({ x, y });
      }
    }
    return newGuards;
  };

  const findCaveExit = (x: number, y: number) => {
    // Find all cave positions except the current one
    const cavePositions = [] as { x: number; y: number }[];
    grid.forEach((row, cy) => {
      row.forEach((cell, cx) => {
        if (cell === "CAVE" && (cx !== x || cy !== y)) {
          cavePositions.push({ x: cx, y: cy });
        }
      });
    });

    // If there are no other caves, return null
    if (cavePositions.length === 0) return null;

    // Return a random cave position
    return cavePositions[Math.floor(Math.random() * cavePositions.length)];
  };

  const initializeGrid = () => {
    const newGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(GRID_SIZE)
          .fill(null)
          .map(() => {
            const rand = Math.random();
            if (rand < 0.1) return "QUICKSAND";
            if (rand < 0.15) return "WOLF";
            if (rand < 0.2) return "ROCK";
            if (rand < 0.25) return "CAVE";
            if (rand < 0.3) return "BROWN_MUSHROOM";
            if (rand < 0.35) return "RED_MUSHROOM";
            if (rand < 0.4) return "BUSH";
            if (rand < 0.45) return "RIVER";
            return "EMPTY";
          }),
      );

    setGrid(newGrid);
    setGuards(spawnGuards(newGrid));
    setPlayerPos({
      x: Math.floor(GRID_SIZE / 2),
      y: Math.floor(GRID_SIZE / 2),
    });
  };

  return (
    <div className="flex gap-4 p-4 bg-black min-h-screen text-white">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div
            className="grid gap-px bg-gray-800"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            }}
          >
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const isGuard = guards.some((g) => g.x === x && g.y === y);
                const isPlayer = playerPos.x === x && playerPos.y === y;

                return (
                  <div
                    key={`${x}-${y}`}
                    className="flex items-center justify-center bg-gray-900"
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                    }}
                  >
                    {/* Only render static tiles */}
                    {!isPlayer &&
                      !isGuard &&
                      TILES[cell as keyof typeof TILES].emoji}
                  </div>
                );
              }),
            )}
          </div>

          {/* Animated Sprites Overlay */}
          <div className="absolute top-0 left-0 pointer-events-none">
            <AnimatedSprite
              emoji={TILES.PLAYER.emoji}
              gridPos={playerPos}
              cellSize={CELL_SIZE}
              className={isHidden ? "opacity-50" : ""}
              teleporting={isTeleporting}
            />

            {guards.map((guard, index) => (
              <AnimatedSprite
                key={`guard-${index}`}
                emoji={TILES.GUARD.emoji}
                gridPos={guard}
                cellSize={CELL_SIZE}
                className="transition-opacity duration-200"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 w-32 gap-2">
          <button
            onClick={() => movePlayer(-1, 0)}
            disabled={gameOver}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500"
          >
            ←
          </button>
          <button
            onClick={() => movePlayer(0, -1)}
            disabled={gameOver}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500"
          >
            ↑
          </button>
          <button
            onClick={() => movePlayer(1, 0)}
            disabled={gameOver}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500"
          >
            →
          </button>
          <div></div>
          <button
            onClick={() => movePlayer(0, 1)}
            disabled={gameOver}
            className="p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-500"
          >
            ↓
          </button>
          <div></div>
        </div>
      </div>

      <div className="w-64 bg-gray-900 p-4 rounded flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <button
            onClick={rollDice}
            disabled={gameOver}
            className={`px-4 py-2 rounded ${gameOver ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-600"}`}
          >
            Roll Dice (R) - {movesLeft} moves left
          </button>

          <div className="flex flex-col gap-1 text-sm">
            <span>❤️ {health}</span>
            <span className="text-gray-300">
              Turn {turnCount} | Position {playerPos.x + totalOffset}
            </span>
            {isHidden && <span>🌳 Hidden</span>}
            {gameOver && (
              <span className="text-red-500 font-bold">Game Over!</span>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-grow">
          <h2 className="text-lg mb-2 font-bold">Activity Log</h2>
          <div className="space-y-1 font-mono text-sm flex-grow overflow-y-auto">
            {actionLog.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-500">{log.time}</span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="bg-gray-800 px-2 py-1 rounded w-24"
              placeholder="Seed"
            />
            <button
              onClick={() => {
                initializeGrid();
                setGameOver(false);
                setPlayerPos({
                  x: Math.floor(GRID_SIZE / 2),
                  y: Math.floor(GRID_SIZE / 2),
                });
                setMovesLeft(0);
                setHealth(100);
                setIsHidden(false);
                setActionLog([]);
              }}
              className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridGame;
