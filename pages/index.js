import { useEffect, useRef, useState } from "react";

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const TICK_MS = 120;

const PALETTE = {
  outerBg: "#0a0a0a",
  bg: "#111111",
  border: "#333333",
  text: "#ffffff",
  snake: "#2a9d8f",
  food: "#e63946",
};

function randomCell(exclude) {
  let cell;
  do {
    cell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (exclude.some((c) => c.x === cell.x && c.y === cell.y));
  return cell;
}

export default function Home() {
  const canvasRef = useRef(null);
  const snakeRef = useRef(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  const foodRef = useRef(randomCell(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const dir = directionRef.current;
      let next = null;
      if (e.key === "ArrowUp" && dir.y === 0) next = { x: 0, y: -1 };
      else if (e.key === "ArrowDown" && dir.y === 0) next = { x: 0, y: 1 };
      else if (e.key === "ArrowLeft" && dir.x === 0) next = { x: -1, y: 0 };
      else if (e.key === "ArrowRight" && dir.x === 0) next = { x: 1, y: 0 };
      if (next) {
        e.preventDefault();
        nextDirectionRef.current = next;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (gameOver) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const interval = setInterval(() => {
      directionRef.current = nextDirectionRef.current;
      const dir = directionRef.current;
      const snake = snakeRef.current;
      const head = {
        x: snake[0].x + dir.x,
        y: snake[0].y + dir.y,
      };

      const hitWall =
        head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
      const hitSelf = snake.some((c) => c.x === head.x && c.y === head.y);

      if (hitWall || hitSelf) {
        setGameOver(true);
        return;
      }

      const newSnake = [head, ...snake];
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore((s) => s + 1);
        foodRef.current = randomCell(newSnake);
      } else {
        newSnake.pop();
      }
      snakeRef.current = newSnake;

      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.fillStyle = PALETTE.food;
      ctx.fillRect(
        foodRef.current.x * CELL_SIZE,
        foodRef.current.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );

      ctx.fillStyle = PALETTE.snake;
      newSnake.forEach((c) => {
        ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [gameOver]);

  const restart = () => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    foodRef.current = randomCell(INITIAL_SNAKE);
    setScore(0);
    setGameOver(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: PALETTE.outerBg,
        color: PALETTE.text,
        fontFamily: "sans-serif",
        gap: "12px",
      }}
    >
      <h1>Snake</h1>
      <p>Score: {score}</p>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ border: `2px solid ${PALETTE.border}` }}
      />
      {gameOver && (
        <div style={{ textAlign: "center" }}>
          <p>Game Over!</p>
          <button onClick={restart} style={{ padding: "8px 16px", fontSize: "16px" }}>
            Restart
          </button>
        </div>
      )}
      <p style={{ opacity: 0.6 }}>Use arrow keys to control the snake</p>
    </div>
  );
}
