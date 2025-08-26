"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"

interface Doge {
  x: number
  y: number
  velocity: number
  width: number
  height: number
}

interface Obstacle {
  id: number
  x: number
  y: number
  width: number
  height: number
  type: "asteroid" | "satellite" | "doge-face"
  passed: boolean
}

interface MemeCoin {
  id: number
  x: number
  y: number
  width: number
  height: number
  collected: boolean
}

interface SpeechBubble {
  id: number
  text: string
  x: number
  y: number
  timestamp: number
}

type GameMode = "normal" | "meme" | "zen"

// ✅ Extracted Components
const ObstacleComp = ({ obstacle }: { obstacle: Obstacle }) => (
  <div
    className={`absolute rounded-lg flex items-center justify-center text-2xl ${
      obstacle.type === "asteroid"
        ? "bg-gray-600"
        : obstacle.type === "satellite"
        ? "bg-gray-400"
        : "bg-yellow-400"
    }`}
    style={{ left: obstacle.x, top: obstacle.y, width: obstacle.width, height: obstacle.height }}
  >
    {obstacle.type === "asteroid" && "🪨"}
    {obstacle.type === "satellite" && "🛰️"}
    {obstacle.type === "doge-face" && "🐕"}
  </div>
)

const CoinComp = ({ coin }: { coin: MemeCoin }) => (
  <div
    className="absolute bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center float"
    style={{ left: coin.x, top: coin.y, width: coin.width, height: coin.height }}
  >
    💰
  </div>
)

const SpeechBubbleComp = ({ bubble }: { bubble: SpeechBubble }) => (
  <div
    className="absolute speech-bubble text-sm font-bold text-primary z-10"
    style={{ left: bubble.x, top: bubble.y }}
  >
    {bubble.text}
  </div>
)

export default function AstroDogeFlappy() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [gameMode, setGameMode] = useState<GameMode>("normal")
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [doge, setDoge] = useState<Doge>({ x: 100, y: 250, velocity: 0, width: 40, height: 40 })
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [memeCoins, setMemeCoins] = useState<MemeCoin[]>([])
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([])
  const [stars, setStars] = useState<Array<{ x: number; y: number; size: number }>>([])

  const GAME_WIDTH = 800
  const GAME_HEIGHT = 600
  const GRAVITY = 0.6
  const JUMP_FORCE = -12
  const COIN_SPEED = 3

  const DOGE_PHRASES = [
    "AEC MANE JUI ✨",
    "BADE HARAMI HO BETA🚀",
    "DOGESH BHAI OP🐶",
    "ROKDAAA 💰",
    "PAISA HI PAISA HOGA🪙",
    "PANCHI BANU UDTI CHALU 🛸",
    "UTHA LE RE BABA 🌟",
    "BABURAO KA STYLE HAI🐕",
  ]

  // ✅ Load best score + stars
  useEffect(() => {
    const saved = localStorage.getItem("astro-doge-best-score")
    if (saved) setBestScore(Number.parseInt(saved))

    const newStars = Array.from({ length: 100 }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: Math.random() * 3 + 1,
    }))
    setStars(newStars)
  }, [])

  useEffect(() => {
    localStorage.setItem("astro-doge-best-score", bestScore.toString())
  }, [bestScore])

  const flap = useCallback(() => {
    if (gameState === "playing") setDoge((prev) => ({ ...prev, velocity: JUMP_FORCE }))
  }, [gameState])

  // ✅ Keyboard + Click + Mobile controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault()
        flap()
      }
    }
    const handleClick = () => flap()
    const handleTouch = () => flap()

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("click", handleClick)
    window.addEventListener("touchstart", handleTouch)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("click", handleClick)
      window.removeEventListener("touchstart", handleTouch)
    }
  }, [flap])

  const generateObstacle = useCallback(
    (x: number): Obstacle => {
      const types: Obstacle["type"][] = gameMode === "meme" ? ["doge-face"] : ["asteroid", "satellite"]
      const type = types[Math.floor(Math.random() * types.length)]
      return { id: Math.random(), x, y: Math.random() * (GAME_HEIGHT - 100) + 50, width: 60, height: 60, type, passed: false }
    },
    [gameMode],
  )

  const generateMemeCoin = useCallback((x: number): MemeCoin => ({
    id: Math.random(),
    x,
    y: Math.random() * (GAME_HEIGHT - 100) + 50,
    width: 30,
    height: 30,
    collected: false,
  }), [])

  const addSpeechBubble = useCallback((x: number, y: number) => {
    const phrase = DOGE_PHRASES[Math.floor(Math.random() * DOGE_PHRASES.length)]
    setSpeechBubbles((prev) => [...prev, { id: Math.random(), text: phrase, x: x + 50, y: y - 30, timestamp: Date.now() }])
  }, [])

  // ✅ Game Loop with requestAnimationFrame
  useEffect(() => {
    if (gameState !== "playing") return
    let frame: number

    const loop = () => {
      const difficultyMultiplier = 1 + score / 50
      const OBSTACLE_SPEED = gameMode === "zen" ? 0 : 3 * difficultyMultiplier

      // Doge physics
      setDoge((prev) => {
        const newY = prev.y + prev.velocity
        const newVelocity = prev.velocity + GRAVITY
        if (newY <= 0 || newY >= GAME_HEIGHT - prev.height) {
          setGameState("gameOver")
          setBestScore((b) => Math.max(b, score))
          return prev
        }
        return { ...prev, y: newY, velocity: newVelocity }
      })

      // Obstacles
      if (gameMode !== "zen") {
        setObstacles((prev) => {
          const updated = prev.map((o) => ({ ...o, x: o.x - OBSTACLE_SPEED }))
          const visible = updated.filter((o) => o.x > -100)
          const last = visible[visible.length - 1]
          if (!last || last.x < GAME_WIDTH - 250) visible.push(generateObstacle(GAME_WIDTH))
          return visible
        })
      }

      // Coins
      setMemeCoins((prev) => {
        const updated = prev.map((c) => ({ ...c, x: c.x - COIN_SPEED }))
        const visible = updated.filter((c) => c.x > -50 && !c.collected)
        const last = visible[visible.length - 1]
        if (!last || last.x < GAME_WIDTH - 200) visible.push(generateMemeCoin(GAME_WIDTH))
        return visible
      })

      // Speech bubbles expire
      setSpeechBubbles((prev) => prev.filter((b) => Date.now() - b.timestamp < 2000))

      // Collision checks (immutable)
      setObstacles((prev) => prev.map((o) => {
        if (!o.passed && o.x + o.width < doge.x) {
          setScore((s) => s + 1)
          return { ...o, passed: true }
        }
        if (
          doge.x < o.x + o.width && doge.x + doge.width > o.x &&
          doge.y < o.y + o.height && doge.y + doge.height > o.y
        ) {
          setGameState("gameOver")
          setBestScore((b) => Math.max(b, score))
        }
        return o
      }))

      setMemeCoins((prev) => prev.map((c) => {
        if (!c.collected &&
          doge.x < c.x + c.width && doge.x + doge.width > c.x &&
          doge.y < c.y + c.height && doge.y + doge.height > c.y
        ) {
          addSpeechBubble(c.x, c.y)
          setScore((s) => s + 5)
          return { ...c, collected: true }
        }
        return c
      }))

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [gameState, score, gameMode, generateObstacle, generateMemeCoin, doge, addSpeechBubble])

  const startGame = (mode: GameMode) => {
    setGameMode(mode)
    setGameState("playing")
    setScore(0)
    setDoge({ x: 100, y: 250, velocity: 0, width: 40, height: 40 })
    setObstacles(mode === "zen" ? [] : [generateObstacle(GAME_WIDTH)])
    setMemeCoins([generateMemeCoin(GAME_WIDTH + 100)])
    setSpeechBubbles([])
  }

  const resetGame = () => {
    setGameState("menu")
    setScore(0)
    setObstacles([])
    setMemeCoins([])
    setSpeechBubbles([])
  }

  const getGameOverMessage = () => {
    if (score === 0) return "SALA YEH DUKH KAHE KHATAM NHI HOTA 😢"
    if (score < 10) return "BETTER LUCK NEXT TIME🐕"
    if (score < 25) return "BAH MODIJI BAH 🌟"
    return "MOGAMBO KHUSH HUA 🚀"
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-6 bg-card border-2 border-border shadow-lg">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-primary mb-2">Astro Doge Flappy 🚀</h1>
          <p className="text-muted-foreground">Help Doge navigate space! Click, tap or press SPACE to flap!</p>
        </div>

        {gameState === "menu" && (
          <div className="text-center space-y-4">
            <p className="text-lg">Best Score: <span className="text-accent font-bold">{bestScore}</span></p>
            <div className="space-y-2">
              <Button onClick={() => startGame("normal")} className="w-full bg-primary hover:bg-primary/90">🌌 Normal Mode</Button>
              <Button onClick={() => startGame("meme")} className="w-full bg-secondary hover:bg-secondary/90">🌈 Meme Mode</Button>
              <Button onClick={() => startGame("zen")} className="w-full bg-accent hover:bg-accent/90">🧘 Zen Mode</Button>
            </div>
          </div>
        )}

        {gameState === "gameOver" && (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Game Over!</h2>
            <p>{getGameOverMessage()}</p>
            <p>Score: <span className="font-bold text-accent">{score}</span></p>
            <p>Best: <span className="font-bold text-accent">{bestScore}</span></p>
            <div className="space-x-4">
              <Button onClick={() => startGame(gameMode)} className="bg-primary hover:bg-primary/90">Try Again</Button>
              <Button onClick={resetGame} variant="outline">Main Menu</Button>
            </div>
          </div>
        )}

        {(gameState === "playing" || gameState === "gameOver") && (
          <div className="mt-6">
            <p className="text-center text-2xl font-bold mb-4">Score: <span className="text-accent">{score}</span></p>

            <div
              className={`relative border-2 border-border rounded-lg overflow-hidden cursor-pointer ${
                gameMode === "meme" ? "rainbow-bg" : "bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-800"
              }`}
              style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
              onClick={flap}
            >
              {gameMode !== "meme" && stars.map((s, i) => (
                <div key={i} className="absolute bg-white rounded-full twinkle" style={{ left: s.x, top: s.y, width: s.size, height: s.size }} />
              ))}

              {obstacles.map((o) => <ObstacleComp key={o.id} obstacle={o} />)}
              {memeCoins.filter((c) => !c.collected).map((c) => <CoinComp key={c.id} coin={c} />)}

              <motion.div
                animate={{ rotate: Math.min(Math.max(doge.velocity * 3, -30), 30) }}
                transition={{ duration: 0.1 }}
                className={`absolute rounded-full shadow-lg flex items-center justify-center text-2xl ${
                  gameMode === "meme" ? "bg-gradient-to-r from-pink-400 to-purple-400" : "bg-orange-400"
                }`}
                style={{ left: doge.x, top: doge.y, width: doge.width, height: doge.height }}
              >🐕‍🦺</motion.div>

              {speechBubbles.map((b) => <SpeechBubbleComp key={b.id} bubble={b} />)}

              {gameState === "gameOver" && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold text-destructive mb-2">CRASHED!</h3>
                    <p className="text-muted-foreground">Click or tap to try again</p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-center mt-4 text-sm text-muted-foreground">
              Click, tap or press SPACE to flap • {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Mode
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
