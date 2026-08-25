import { useEffect, useRef, useState } from "react";

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const MIN_SPEED = 1;
const MAX_SPEED = 10;
const DEFAULT_SPEED = 5;
const SLOWEST_TICK_MS = 200;
const FASTEST_TICK_MS = 40;

function speedToTickMs(speed) {
  const ratio = (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED);
  return Math.round(SLOWEST_TICK_MS - ratio * (SLOWEST_TICK_MS - FASTEST_TICK_MS));
}

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

const TITLE_COLS = 26;
const TITLE_ROWS = 16;
const TITLE_PIXEL = 12;
const TITLE_CANVAS_WIDTH = TITLE_COLS * TITLE_PIXEL;
const TITLE_CANVAS_HEIGHT = TITLE_ROWS * TITLE_PIXEL;

const TITLE_LEFT_SNAKE = [
  { x: 1, y: 9 },
  { x: 2, y: 9 },
  { x: 3, y: 8 },
  { x: 4, y: 8 },
  { x: 5, y: 9 },
  { x: 6, y: 9 },
  { x: 7, y: 8 },
  { x: 8, y: 8 },
  { x: 9, y: 7 },
  { x: 10, y: 6 },
];

const TITLE_RIGHT_SNAKE = [
  { x: 24, y: 9 },
  { x: 23, y: 9 },
  { x: 22, y: 8 },
  { x: 21, y: 8 },
  { x: 20, y: 9 },
  { x: 19, y: 9 },
  { x: 18, y: 8 },
  { x: 17, y: 8 },
  { x: 16, y: 7 },
  { x: 15, y: 6 },
];

const TITLE_FOOD_CELLS = [
  { x: 12, y: 5 },
  { x: 13, y: 5 },
];

function drawTitleArt(ctx) {
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < TITLE_ROWS; y++) {
    for (let x = 0; x < TITLE_COLS; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.bg : PALETTE.bgGrid;
      ctx.fillRect(x * TITLE_PIXEL, y * TITLE_PIXEL, TITLE_PIXEL, TITLE_PIXEL);
    }
  }

  const drawPixel = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * TITLE_PIXEL, y * TITLE_PIXEL, TITLE_PIXEL, TITLE_PIXEL);
  };

  TITLE_FOOD_CELLS.forEach((c) => drawPixel(c.x, c.y, PALETTE.foodGlow));
  TITLE_FOOD_CELLS.forEach((c) => drawPixel(c.x, c.y, PALETTE.food));

  [
    { snake: TITLE_LEFT_SNAKE, headColor: PALETTE.snakeHead, evenColor: PALETTE.snakeBody, oddColor: PALETTE.snakeBodyDark },
    { snake: TITLE_RIGHT_SNAKE, headColor: PALETTE.snakeBodyDark, evenColor: PALETTE.snakeBodyDark, oddColor: PALETTE.snakeBody },
  ].forEach(({ snake, headColor, evenColor, oddColor }) => {
    snake.forEach((c, i) => {
      const isHead = i === snake.length - 1;
      const color = isHead ? headColor : i % 2 === 0 ? evenColor : oddColor;
      drawPixel(c.x, c.y, color);
    });
  });

  const drawEye = (headCell, facingRight) => {
    ctx.fillStyle = PALETTE.snakeEye;
    const ex = headCell.x * TITLE_PIXEL + (facingRight ? TITLE_PIXEL * 0.6 : TITLE_PIXEL * 0.15);
    const ey = headCell.y * TITLE_PIXEL + TITLE_PIXEL * 0.25;
    ctx.fillRect(ex, ey, TITLE_PIXEL * 0.25, TITLE_PIXEL * 0.25);
  };
  drawEye(TITLE_LEFT_SNAKE[TITLE_LEFT_SNAKE.length - 1], true);
  drawEye(TITLE_RIGHT_SNAKE[TITLE_RIGHT_SNAKE.length - 1], false);

  const drawTongue = (headCell, facingRight) => {
    ctx.fillStyle = PALETTE.food;
    const tx = headCell.x * TITLE_PIXEL + (facingRight ? TITLE_PIXEL : -TITLE_PIXEL * 0.35);
    const ty = headCell.y * TITLE_PIXEL + TITLE_PIXEL * 0.4;
    ctx.fillRect(tx, ty, TITLE_PIXEL * 0.35, TITLE_PIXEL * 0.2);
  };
  drawTongue(TITLE_LEFT_SNAKE[TITLE_LEFT_SNAKE.length - 1], true);
  drawTongue(TITLE_RIGHT_SNAKE[TITLE_RIGHT_SNAKE.length - 1], false);

  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, TITLE_CANVAS_WIDTH - 2, TITLE_CANVAS_HEIGHT - 2);
}

const HUD_PADDING = 6;
const HUD_HEIGHT = 26;

function drawScoreHud(ctx, score, highScore, isNewBest) {
  ctx.fillStyle = PALETTE.bg;
  ctx.globalAlpha = 0.85;
  drawRoundedRect(ctx, HUD_PADDING, HUD_PADDING, CANVAS_SIZE - HUD_PADDING * 2, HUD_HEIGHT, 6);
  ctx.globalAlpha = 1;

  ctx.font = "bold 14px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, HUD_PADDING + 10, HUD_PADDING + HUD_HEIGHT / 2 + 1);

  ctx.textAlign = "right";
  ctx.fillStyle = isNewBest ? PALETTE.food : PALETTE.text;
  ctx.fillText(`Best: ${highScore}`, CANVAS_SIZE - HUD_PADDING - 10, HUD_PADDING + HUD_HEIGHT / 2 + 1);
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
  const titleCanvasRef = useRef(null);
  const snakeRef = useRef(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  const foodRef = useRef(randomCell(INITIAL_SNAKE));
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [screen, setScreen] = useState("start");
  const [paused, setPaused] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState(null);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const pausedRef = useRef(false);
  const highScoreRef = useRef(0);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem("snake-high-score"));
    if (!Number.isNaN(stored) && stored > 0) {
      setHighScore(stored);
      highScoreRef.current = stored;
    }
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (screen !== "start" || !titleCanvasRef.current) return;
    const ctx = titleCanvasRef.current.getContext("2d");
    drawTitleArt(ctx);
  }, [screen]);

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
        scoreRef.current += 1;
        setScore(scoreRef.current);
        if (scoreRef.current > highScoreRef.current) {
          highScoreRef.current = scoreRef.current;
          setHighScore(scoreRef.current);
          window.localStorage.setItem("snake-high-score", String(scoreRef.current));
        }
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

      drawScoreHud(ctx, scoreRef.current, highScoreRef.current, scoreRef.current === highScoreRef.current && scoreRef.current > 0);
    }, speedToTickMs(speed));

    return () => clearInterval(interval);
  }, [screen, speed]);

  const restart = () => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    foodRef.current = randomCell(INITIAL_SNAKE);
    scoreRef.current = 0;
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
          <canvas
            ref={titleCanvasRef}
            width={TITLE_CANVAS_WIDTH}
            height={TITLE_CANVAS_HEIGHT}
            style={{
              imageRendering: "pixelated",
              border: `2px solid ${PALETTE.border}`,
              marginTop: "8px",
            }}
          />
          <p style={{ opacity: 0.6 }}>Use arrow keys to move</p>
          <div style={{ marginTop: "16px" }}>
            <label htmlFor="speed-slider" style={{ opacity: 0.8, fontSize: "14px" }}>
              Speed: {speed}
            </label>
            <br />
            <input
              id="speed-slider"
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ marginTop: "4px" }}
            />
          </div>
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
          <p>
            Score: {score} &nbsp;·&nbsp; Best: {highScore}
          </p>
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
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: PALETTE.bg,
                  opacity: 0.85,
                  color: PALETTE.text,
                  fontSize: "24px",
                  gap: "12px",
                }}
              >
                {resumeCountdown !== null ? (
                  resumeCountdown
                ) : (
                  <>
                    <span>Paused</span>
                    <div style={{ fontSize: "14px", textAlign: "center" }}>
                      <label htmlFor="pause-speed-slider" style={{ opacity: 0.8 }}>
                        Speed: {speed}
                      </label>
                      <br />
                      <input
                        id="pause-speed-slider"
                        type="range"
                        min={MIN_SPEED}
                        max={MAX_SPEED}
                        step={1}
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        style={{ marginTop: "4px" }}
                      />
                    </div>
                  </>
                )}
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
