import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// 棋盘大小（格子数，正方形棋盘）
const BOARD_SIZE = 20

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'
type GameStatus = 'idle' | 'running' | 'paused' | 'over'
type Difficulty = 'easy' | 'normal' | 'hard'

const DX: Record<Direction, number> = { up: 0, down: 0, left: -1, right: 1 }
const DY: Record<Direction, number> = { up: -1, down: 1, left: 0, right: 0 }
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

// 每个难度对应的移动间隔（毫秒），数值越小蛇越快
const SPEED_MS: Record<Difficulty, number> = { easy: 300, normal: 200, hard: 120 }
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']
const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', normal: '普通', hard: '困难' }

// 初始蛇：3 格，位于棋盘中部，方向朝右
function initialSnake(): Point[] {
  const mid = Math.floor(BOARD_SIZE / 2)
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid }
  ]
}

// 随机生成一个不在蛇身上的食物
function randomFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  const free: Point[] = []
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) return { x: -1, y: -1 } // 棋盘已满（实际到不了）
  return free[Math.floor(Math.random() * free.length)]
}

function SnakeGame(): React.JSX.Element {
  const [snake, setSnake] = useState<Point[]>(initialSnake)
  const [food, setFood] = useState<Point>(() => randomFood(initialSnake()))
  const [status, setStatus] = useState<GameStatus>('idle')
  const [score, setScore] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [best, setBest] = useState<number>(() => {
    const v = Number(localStorage.getItem('snake-best'))
    return Number.isFinite(v) ? v : 0
  })

  // 用 ref 保存方向，避免闭包拿到旧值；队列用于缓冲快速按键
  const directionRef = useRef<Direction>('right')
  const dirQueue = useRef<Direction[]>([])
  const statusRef = useRef<GameStatus>(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  // 重新开始一局（并立即运行）
  const reset = useCallback((): void => {
    const s = initialSnake()
    setSnake(s)
    setFood(randomFood(s))
    setScore(0)
    directionRef.current = 'right'
    dirQueue.current = []
    setStatus('running')
  }, [])

  // 游戏结束：记录最高分
  const gameOver = useCallback((): void => {
    setStatus('over')
    setBest((prev) => {
      const newBest = Math.max(prev, score)
      if (newBest > prev) localStorage.setItem('snake-best', String(newBest))
      return newBest
    })
  }, [score])

  // 前进一步
  const step = useCallback((): void => {
    const dir = dirQueue.current.shift() ?? directionRef.current
    directionRef.current = dir
    const head = snake[0]
    const newHead = { x: head.x + DX[dir], y: head.y + DY[dir] }

    const hitWall =
      newHead.x < 0 || newHead.x >= BOARD_SIZE || newHead.y < 0 || newHead.y >= BOARD_SIZE
    // 撞自己：吃到食物时尾巴不动（撞到任何蛇身都算死）；没吃到时尾巴会移走，可以进入尾巴的位置
    const ate = newHead.x === food.x && newHead.y === food.y
    const bodyToCheck = ate ? snake : snake.slice(0, -1)
    const hitSelf = bodyToCheck.some((p) => p.x === newHead.x && p.y === newHead.y)
    if (hitWall || hitSelf) {
      gameOver()
      return
    }

    const newSnake = [newHead, ...snake]
    if (ate) {
      setScore((s) => s + 1)
      setFood(randomFood(newSnake))
    } else {
      newSnake.pop()
    }
    setSnake(newSnake)
  }, [snake, food, gameOver])

  // 游戏循环：状态为 running 时，每隔 SPEED_MS 前进一步
  useEffect(() => {
    if (status !== 'running') return
    const timer = setTimeout(step, SPEED_MS[difficulty])
    return () => clearTimeout(timer)
  }, [status, snake, food, difficulty, step])

  // 键盘控制
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key.startsWith('Arrow')) e.preventDefault()

      const dirMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right'
      }

      if (e.key === ' ') {
        e.preventDefault()
        const s = statusRef.current
        if (s === 'running') setStatus('paused')
        else if (s === 'paused' || s === 'idle') setStatus('running')
        else if (s === 'over') reset()
        return
      }

      const dir = dirMap[e.key]
      if (!dir) return
      // 不能与当前（或队列末尾）方向相同或相反
      const last =
        dirQueue.current.length > 0
          ? dirQueue.current[dirQueue.current.length - 1]
          : directionRef.current
      if (dir === last || OPPOSITE[dir] === last) return
      dirQueue.current.push(dir)
      if (dirQueue.current.length > 3) dirQueue.current.shift()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reset])

  // 主按钮：开始 / 暂停 / 继续 / 重新开始
  const toggle = (): void => {
    const s = status
    if (s === 'running') setStatus('paused')
    else if (s === 'paused' || s === 'idle') setStatus('running')
    else reset() // over
  }

  const mainLabel =
    status === 'running' ? '暂停' : status === 'paused' ? '继续' : status === 'over' ? '重新开始' : '开始'

  const snakeSet = useMemo(() => new Set(snake.map((p) => `${p.x},${p.y}`)), [snake])
  const headKey = `${snake[0].x},${snake[0].y}`
  const foodKey = `${food.x},${food.y}`

  const cells = useMemo(
    () =>
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
        const x = i % BOARD_SIZE
        const y = Math.floor(i / BOARD_SIZE)
        const key = `${x},${y}`
        let cls = 'snake-cell'
        if (key === headKey) cls += ' snake-head'
        else if (snakeSet.has(key)) cls += ' snake-body'
        else if (key === foodKey) cls += ' snake-food'
        return { key, cls }
      }),
    [snakeSet, headKey, foodKey]
  )

  return (
    <div className="snake-game">
      <div className="snake-topbar">
        <div className="snake-group">
          <span className="snake-label">难度</span>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`btn btn-sm ${difficulty === d ? 'btn-primary' : ''}`}
              onClick={(e) => {
                setDifficulty(d)
                e.currentTarget.blur()
              }}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="snake-group">
          <span className="snake-score">分数 {score}</span>
          <span className="snake-score snake-best">最高 {best}</span>
        </div>
      </div>

      <div className="snake-board-wrap">
        <div className="snake-board" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}>
          {cells.map((c) => (
            <div key={c.key} className={c.cls} />
          ))}
        </div>
        {status !== 'running' && (
          <div className="snake-overlay">
            {status === 'idle' && <p>按「空格」或点「开始」开始游戏</p>}
            {status === 'paused' && <p>已暂停</p>}
            {status === 'over' && (
              <p>
                游戏结束！本局得分 {score}
                <br />
                按「空格」或点「重新开始」再来一局
              </p>
            )}
          </div>
        )}
      </div>

      <div className="snake-controls">
        <button
          className="btn btn-primary"
          onClick={(e) => {
            toggle()
            e.currentTarget.blur()
          }}
        >
          {mainLabel}
        </button>
        <button
          className="btn"
          onClick={(e) => {
            reset()
            e.currentTarget.blur()
          }}
        >
          重新开始
        </button>
      </div>
      <p className="snake-tip">方向键 ↑ ↓ ← → 控制方向 · 空格键 开始 / 暂停</p>
    </div>
  )
}

export default SnakeGame
