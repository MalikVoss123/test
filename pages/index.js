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
  bgGrid: "#1a1a1a",
  border: "#333333",
  text: "#ffffff",
  snakeHead: "#40c9b8",
  snakeBody: "#2a9d8f",
  snakeBodyDark: "#1f7a70",
  snakeEye: "#0a0a0a",
  food: "#e63946",
  foodGlow: "rgba(230, 57, 70, 0.35)",
};

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

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
  const [screen, setScreen] = useState("start");
  const [paused, setPaused] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (resumeCountdown === null) return;
    if (resumeCountdown === "GO") {
      const timeout = setTimeout(() => {
        setResumeCountdown(null);
        setPaused(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      setResumeCountdown((c) => (c === 1 ? "GO" : c - 1));
    }, 700);
    return () => clearTimeout(timeout);
  }, [resumeCountdown]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (screen === "start") {
        if (e.key === " ") {
          e.preventDefault();
          setScreen("playing");
        }
        return;
      }
      if (screen === "playing" && e.key === " ") {
        e.preventDefault();
        if (resumeCountdown !== null) return;
        if (paused) {
          setResumeCountdown(3);
        } else {
          setPaused(true);
        }
        return;
      }
      if (screen !== "playing") return;
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
  }, [screen, paused, resumeCountdown]);

  useEffect(() => {
    if (screen !== "playing") return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const interval = setInterval(() => {
      if (pausedRef.current) return;
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
        setScreen("gameover");
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

      ctx.strokeStyle = PALETTE.bgGrid;
      ctx.lineWidth = 1;
      for (let i = 1; i < GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE + 0.5, 0);
        ctx.lineTo(i * CELL_SIZE + 0.5, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE + 0.5);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE + 0.5);
        ctx.stroke();
      }

      const foodCx = foodRef.current.x * CELL_SIZE + CELL_SIZE / 2;
      const foodCy = foodRef.current.y * CELL_SIZE + CELL_SIZE / 2;
      const foodRadius = CELL_SIZE / 2 - 2;
      ctx.fillStyle = PALETTE.foodGlow;
      ctx.beginPath();
      ctx.arc(foodCx, foodCy, foodRadius + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.food;
      ctx.beginPath();
      ctx.arc(foodCx, foodCy, foodRadius, 0, Math.PI * 2);
      ctx.fill();

      const inset = 1;
      newSnake.forEach((c, i) => {
        const isHead = i === 0;
        ctx.fillStyle = isHead
          ? PALETTE.snakeHead
          : i % 2 === 0
          ? PALETTE.snakeBody
          : PALETTE.snakeBodyDark;
        drawRoundedRect(
          ctx,
          c.x * CELL_SIZE + inset,
          c.y * CELL_SIZE + inset,
          CELL_SIZE - inset * 2,
          CELL_SIZE - inset * 2,
          isHead ? 6 : 4
        );
      });

      if (newSnake.length > 0) {
        const head = newSnake[0];
        const hx = head.x * CELL_SIZE;
        const hy = head.y * CELL_SIZE;
        const eyeOffset = CELL_SIZE * 0.28;
        const eyeRadius = Math.max(1.5, CELL_SIZE * 0.09);
        const perpX = dir.y !== 0 ? 1 : 0;
        const perpY = dir.x !== 0 ? 1 : 0;
        const forwardX = dir.x * eyeOffset;
        const forwardY = dir.y * eyeOffset;
        const sideX = perpX * eyeOffset;
        const sideY = perpY * eyeOffset;
        const cx = hx + CELL_SIZE / 2;
        const cy = hy + CELL_SIZE / 2;
        ctx.fillStyle = PALETTE.snakeEye;
        [1, -1].forEach((s) => {
          ctx.beginPath();
          ctx.arc(
            cx + forwardX + sideX * s,
            cy + forwardY + sideY * s,
            eyeRadius,
            0,
            Math.PI * 2
          );
          ctx.fill();
        });
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [screen]);

  const restart = () => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    foodRef.current = randomCell(INITIAL_SNAKE);
    setScore(0);
    setPaused(false);
    setResumeCountdown(null);
    setScreen("start");
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
      {screen === "start" ? (
        <div style={{ textAlign: "center" }}>
          <h1>Snake</h1>
          <p style={{ opacity: 0.6 }}>Use arrow keys to move</p>
          <p
            onClick={() => setScreen("playing")}
            style={{ cursor: "pointer", fontSize: "18px", marginTop: "16px" }}
          >
            Press Space to Start
          </p>
        </div>
      ) : (
        <>
          <h1>Snake</h1>
          <p>Score: {score}</p>
          <div style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{ border: `2px solid ${PALETTE.border}` }}
            />
            {paused && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: CANVAS_SIZE,
                  height: CANVAS_SIZE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: PALETTE.bg,
                  opacity: 0.85,
                  color: PALETTE.text,
                  fontSize: "24px",
                }}
              >
                {resumeCountdown !== null ? resumeCountdown : "Paused"}
              </div>
            )}
          </div>
          {screen === "gameover" && (
            <div style={{ textAlign: "center" }}>
              <p>Game Over!</p>
              <button onClick={restart} style={{ padding: "8px 16px", fontSize: "16px" }}>
                Restart
              </button>
            </div>
          )}
          <p style={{ opacity: 0.6 }}>
            Use arrow keys to control the snake, Space to pause
          </p>
        </>
      )}
    </div>
  );
}
