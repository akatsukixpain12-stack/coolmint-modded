var master: ChessMint;
var Config: any = undefined;
var context: any = undefined;
var ecoTable: Map<string, any> | null = null;
import { siteAdapterFactory } from './siteAdapters';

class TopMove
{
    readonly from: string;
    readonly to: string;
    readonly line: string[];
    readonly move: string;
    readonly depth: number;
    readonly promotion: string | null;
    readonly cp: number | null;
    readonly mate: number | null;

    constructor(line: string, depth: number, cp: number | null, mate: number | null)
    {
        this.line = line.split(" ");
        this.move = this.line[0];
        this.promotion = this.move.length > 4 ? this.move.substring(4, 5) : null;
        this.from = this.move.substring(0, 2);
        this.to = this.move.substring(2, 4);
        this.cp = cp;
        this.mate = mate;
        this.depth = depth;
    }
}

class GameController
{
    controller: ChessboardGame;
    chessboard: HTMLElement;
    options: GameOptions;
    private depthBar: HTMLElement | null;
    private evalBar: HTMLElement | null;
    private evalBarFill: HTMLElement | null;
    private evalScore: HTMLElement | null;
    private evalScoreAbbreviated: HTMLElement | null;
    private currentMarkings: Marking[];
    private master: ChessMint;

    constructor(master: ChessMint, chessboard: HTMLElement)
    {
        this.master = master;
        this.chessboard = chessboard;
        this.controller = (chessboard as any).game as ChessboardGame;
        this.options = this.controller.getOptions();

        this.depthBar = null;
        this.evalBar = null;
        this.evalBarFill = null;
        this.evalScore = null;
        this.evalScoreAbbreviated = null;
        this.currentMarkings = [];

        let self = this;

        // hook to update the engine on every move
        this.controller.on('Move', (event: IGameEvent) =>
        {
            console.log("On Move", event.data);
            this.UpdateEngine(false);
        });

        // check if a new game has started
        this.controller.on('ModeChanged', (event: IGameEvent) =>
        {
            if (event.data === "playing")
            {
                // at this point, the fen notation isn't updated yet, we should delay this
                setTimeout(() => { this.ResetGame(); }, 100);
            }
        });

        // flip the evaluation board
        this.controller.on('UpdateOptions', (event: IGameEvent) =>
        {
            this.options = this.controller.getOptions();
            if (event.data.flipped != undefined && this.evalBar != null) 
            {
                if (event.data.flipped) this.evalBar.classList.add("evaluation-bar-flipped");
                else this.evalBar.classList.remove("evaluation-bar-flipped");
            }
        });

        this.CreateAnalysisTools();
        setTimeout(() => { this.ResetGame(); }, 100);
    }

    UpdateExtensionOptions()
    {
        let options = this.master.options;
        if (options.evaluation_bar && this.evalBar == null) this.CreateAnalysisTools();
        else if (!options.evaluation_bar && this.evalBar != null)
        {
            this.evalBar.remove();
            this.evalBar = null;
        }

        if (options.depth_bar && this.depthBar == null) this.CreateAnalysisTools();
        else if (!options.depth_bar && this.depthBar != null)
        {
            this.depthBar.parentElement!.remove();
            this.depthBar = null;
        }

        if (!options.show_hints)
        {
            this.RemoveCurrentMarkings();
        }

        if (!options.move_analysis)
        {
            let lastMove = this.controller.getLastMove();
            if (lastMove)
            {
                this.controller.markings.removeOne(`effect|${lastMove.to}`);
            }
        }
    }

    private CreateAnalysisTools()
    {
        // we must wait for a little bit because at this point
        // the chessboard has not been added to chessboard layout (#board-layout-main)
        let interval1 = setInterval(() =>
        {
            let layoutChessboard = this.chessboard.parentElement;
            if (layoutChessboard == null) return;

            let layoutMain = layoutChessboard.parentElement;
            if (layoutMain == null) return;

            clearInterval(interval1);

            if (this.master.options.depth_bar && this.depthBar == null)
            {
                // create depth bar
                let depthBar = document.createElement("div");
                depthBar.classList.add("depthBarLayout");
                depthBar.innerHTML = `<div class="depthBar"><span class="depthBarProgress"></span></div>`;

                layoutMain.insertBefore(depthBar, layoutChessboard.nextSibling);
                this.depthBar = depthBar.querySelector(".depthBarProgress") as HTMLElement;
            }

            if (this.master.options.evaluation_bar && this.evalBar == null)
            {

                // create eval bar
                let evalBar = document.createElement("div");
                evalBar.style.flex = "1 1 auto;";
                evalBar.innerHTML = `
                <div class="evaluation-bar-bar">
                    <span class="evaluation-bar-scoreAbbreviated evaluation-bar-dark">0.0</span>
                    <span class="evaluation-bar-score evaluation-bar-dark ">+0.00</span>
                    <div class="evaluation-bar-fill">
                    <div class="evaluation-bar-color evaluation-bar-black"></div>
                    <div class="evaluation-bar-color evaluation-bar-draw"></div>
                    <div class="evaluation-bar-color evaluation-bar-white" style="transform: translate3d(0px, 50%, 0px);"></div>
                    </div>
                </div>`;

                let layoutEvaluation = layoutChessboard.querySelector("#board-layout-evaluation");
                if (layoutEvaluation == null)
                {
                    layoutEvaluation = document.createElement("div");
                    layoutEvaluation.classList.add("board-layout-evaluation");
                    layoutChessboard.insertBefore(layoutEvaluation, layoutChessboard.firstElementChild);
                }

                layoutEvaluation.innerHTML = "";
                layoutEvaluation.appendChild(evalBar);


                this.evalBar = layoutEvaluation.querySelector(".evaluation-bar-bar");
                this.evalBarFill = layoutEvaluation.querySelector(".evaluation-bar-white");
                this.evalScore = layoutEvaluation.querySelector(".evaluation-bar-score");
                this.evalScoreAbbreviated = layoutEvaluation.querySelector(".evaluation-bar-scoreAbbreviated");

                if (!this.options.isWhiteOnBottom && this.options.flipped)
                    this.evalBar!.classList.add("evaluation-bar-flipped");
            }
        }, 10);
    }

    private UpdateEngine(isNewGame: boolean)
    {
        // console.log("UpdateEngine", isNewGame);
        let FENs = this.controller.getFEN();
        this.master.engine.UpdatePosition(FENs, isNewGame);
        this.SetCurrentDepth(0);
    }

    private ResetGame()
    {
        this.UpdateEngine(true);
    }

    private RemoveCurrentMarkings()
    {
        this.currentMarkings.forEach((marking) =>
        {
            let key = marking.type + "|";
            if (marking.data.square != null) key += marking.data.square;
            else key += `${marking.data.from}${marking.data.to}`;

            this.controller.markings.removeOne(key);
        });

        this.currentMarkings = [];
    }

    HintMoves(topMoves: TopMove[], lastTopMoves: TopMove[], isBestMove: boolean)
    {
        let options = this.master.options;
        let bestMove = topMoves[0];

        if (options.show_hints)
        {
            this.RemoveCurrentMarkings();
            topMoves.forEach((move, idx) =>
            {
                // isBestMove means final evaluation, don't include the moves
                // that has less depth than the best move
                if (isBestMove && move.depth != bestMove.depth) return;

                let color = (idx == 0) ? this.options.arrowColors.default : this.options.arrowColors.alt;

                this.currentMarkings.push({
                    data: {
                        from: move.from,
                        color: color,
                        opacity: 0.7,
                        to: move.to,
                    },
                    node: true,
                    persistent: true,
                    type: "arrow",
                });

                if (move.mate != null)
                {
                    this.currentMarkings.push({
                        data: {
                            square: move.to,
                            type: move.mate < 0 ? "ResignWhite" : "WinnerWhite",
                        },
                        node: true,
                        persistent: true,
                        type: "effect",
                    });
                }
            });

            // reverse the markings to make the best move arrow appear on top
            this.currentMarkings.reverse();
            this.controller.markings.addMany(this.currentMarkings);
        }

        if (options.depth_bar)
        {
            let depthPercent =
                (isBestMove ? bestMove.depth : bestMove.depth - 1)
                / this.master.engine.depth * 100;

            this.SetCurrentDepth(depthPercent);
        }

        if (options.evaluation_bar)
        {
            let score = (bestMove.mate != null ? bestMove.mate : bestMove.cp) as number;
            if (this.controller.getTurn() == 2) score *= -1;

            this.SetEvaluation(score, bestMove.mate != null);
        }
    }

    SetCurrentDepth(percent: number)
    {
        if (this.depthBar == null) return;
        let style = this.depthBar.style;

        if (percent <= 0)
        {
            this.depthBar.classList.add("disable-transition");
            style.width = `0%`;
            this.depthBar.classList.remove("disable-transition");
        } else
        {
            if (percent > 100) percent = 100;
            style.width = `${percent}%`;
        }
    }

    SetEvaluation(score: number, isMate: boolean)
    {
        if (this.evalBar == null) return;

        var percent: number, textScore: string, textScoreAbb: string;

        if (!isMate)
        {
            let eval_max = 500;
            let eval_min = -500;
            let smallScore = score / 100;

            percent = 90 - (((score - eval_min) / (eval_max - eval_min)) * (95 - 5)) + 5;
            if (percent < 5) percent = 5;
            else if (percent > 95) percent = 95;

            textScore = (score >= 0 ? "+" : "") + smallScore.toFixed(2);
            textScoreAbb = Math.abs(smallScore).toFixed(1);

        } else
        {
            percent = score < 0 ? 100 : 0;
            textScore = "M" + Math.abs(score).toString();
            textScoreAbb = textScore;
        }

        this.evalBarFill!.style.transform = `translate3d(0px, ${percent}%, 0px)`;
        this.evalScore!.innerText = textScore;
        this.evalScoreAbbreviated!.innerText = textScoreAbb;
        let classSideAdd = (score >= 0) ? "evaluation-bar-dark" : "evaluation-bar-light";
        let classSideRemove = (score >= 0) ? "evaluation-bar-light" : "evaluation-bar-dark";

        this.evalScore!.classList.remove(classSideRemove);
        this.evalScoreAbbreviated!.classList.remove(classSideRemove);

        this.evalScore!.classList.add(classSideAdd);
        this.evalScoreAbbreviated!.classList.add(classSideAdd);
    }
}

class StockfishEngine
{
    private stockfish: Worker;
    private loaded: boolean;
    private ready: boolean;
    private isEvaluating: boolean;
    private isRequestedStop: boolean;
    private isInTheory: boolean; // is the game still in theory openings
    private master: ChessMint;
    private readyCallbacks: { (): void; }[];
    private goDoneCallbacks: { (): void; }[];

    private topMoves: TopMove[];
    private lastTopMoves: TopMove[];
    private lastMoveScore: TEffectType | null;

    private options: { [opt: string]: string | number | boolean; };

    depth: number;
    readonly threads: number;

    constructor(master: ChessMint)
    {
        let stockfishJsURL: string;
        let stockfishPathConfig = Config.threadedEnginePaths.stockfish;

        this.master = master;
        this.loaded = false;
        this.ready = false;
        this.isEvaluating = false;
        this.isRequestedStop = false;
        this.readyCallbacks = []
        this.goDoneCallbacks = []
        this.topMoves = []
        this.lastTopMoves = []
        this.isInTheory = false;
        this.lastMoveScore = null;

        this.threads = this.master.options.threads;
        this.depth = this.master.options.depth;

        this.options = {};

        // the multiThreaded NNUE engine needs the browser to support SharedArrayBuffer
        try
        {
            new SharedArrayBuffer(1024);
            stockfishJsURL = `${stockfishPathConfig.multiThreaded.loader}#${stockfishPathConfig.multiThreaded.engine}`;

            this.options["Threads"] = this.threads;

            if (this.master.options.use_nnue)
            {
                this.options["Use NNUE"] = true;
                this.options["EvalFile"] = stockfishPathConfig.multiThreaded.nnue;
            }
        }
        catch (e)
        {
            stockfishJsURL = `${stockfishPathConfig.singleThreaded.loader}#${stockfishPathConfig.singleThreaded.engine}`;
        }

        this.options["Hash"] = 512;
        this.options["MultiPV"] = 3;
        this.options["Ponder"] = true;

        // Enable UCI_Elo at maximum strength by default
        this.options["UCI_LimitStrength"] = false;
        this.options["UCI_Elo"] = 3200;

        try
        {
            this.stockfish = new Worker(stockfishJsURL);
            this.stockfish.onmessage = (e) => { this.ProcessMessage(e) };
        } catch (e)
        {
            alert("Failed to load stockfish");
            throw e;
        }

        this.send("uci");
        this.onReady(() =>
        {
            this.UpdateOptions();
            this.send("ucinewgame");
        });
    }

    send(cmd: string): void
    {
        this.stockfish.postMessage(cmd);
    }

    go(): void
    {
        this.onReady(() =>
        {
            this.stopEvaluation(() =>
            {
                console.assert(!this.isEvaluating, "Duplicated Stockfish go command");

                this.isEvaluating = true;
                this.send(`go depth ${this.depth}`);
            })
        });
    }

    onReady(callback: { (): void; })
    {
        if (this.ready) callback();
        else
        {
            this.readyCallbacks.push(callback);
            // console.log("send is ready");
            this.send("isready");
        }
    }

    stopEvaluation(callback: { (): void; })
    {
        // stop the evaluation if it is evaluating
        if (this.isEvaluating)
        {
            // cancel the previous callbacks, replace it with this one
            this.goDoneCallbacks = [callback];
            this.isRequestedStop = true;
            this.send("stop")
        }
        else
        {
            // if there is no evaluation going on, call the function immediately
            callback();
        }
    }

    UpdatePosition(FENs: string | null = null, isNewGame: boolean = true)
    {
        this.onReady(() =>
        {
            this.stopEvaluation(() =>
            {
                this.MoveAndGo(FENs, isNewGame);
            });
        })
    }

    UpdateExtensionOptions()
    {
        this.depth = this.master.options.depth;
        // trigger this method to show hints, analysis,.. if it was disabled before
        // if this.isEvaluating is false, it already found the best move
        if (this.topMoves.length > 0)
            this.onTopMoves(null, !this.isEvaluating);
    }

    private UpdateOptions(options: { [opt: string]: string | number | boolean; } | null = null)
    {
        if (options === null) options = this.options;

        Object.keys(options).forEach((key) =>
        {
            this.send(`setoption name ${key} value ${options![key]}`);
        });
    }

    private ProcessMessage(event: MessageEvent<any>)
    {
        this.ready = false;
        let line: string = (event && typeof event === "object") ? event.data : event;

        // console.log("SF: " + line);

        if (line === 'uciok')
        {
            this.loaded = true;
            this.master.onEngineLoaded();
        }
        else if (line === 'readyok')
        {
            this.ready = true;
            if (this.readyCallbacks.length > 0)
            {
                let copy = this.readyCallbacks;
                this.readyCallbacks = [];
                copy.forEach(function (callback) { callback(); });
            }
        }
        else if (this.isEvaluating && line === 'Load eval file success: 1')
        {
            // we have sent the "go" command before stockfish loaded the eval file
            // this.isEvaluating will be stuck at true, this fixes it.
            this.isEvaluating = false;
            this.isRequestedStop = false;
            if (this.goDoneCallbacks.length > 0)
            {
                let copy = this.goDoneCallbacks;
                this.goDoneCallbacks = [];
                copy.forEach(function (callback) { callback(); });
            }
        }
        else
        {
            let match = line.match(/^info .*\bdepth (\d+) .*\bseldepth (\d+) .*\bmultipv (\d+) .*\bscore (\w+) (-?\d+) .*\bpv (.+)/);

            if (match)
            {
                if (!this.isRequestedStop)
                {
                    let cp = (match[4] == "cp") ? parseInt(match[5]) : null;
                    let mate = (match[4] == "cp") ? null : parseInt(match[5]);
                    let move = new TopMove(match[6], parseInt(match[1]), cp, mate);

                    this.onTopMoves(move, false);
                }
            }
            else if (match = line.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)?/))
            {
                this.isEvaluating = false;
                if (this.goDoneCallbacks.length > 0)
                {
                    let copy = this.goDoneCallbacks;
                    this.goDoneCallbacks = [];
                    copy.forEach(function (callback) { callback(); });
                }

                if (!this.isRequestedStop && match![1] !== undefined)
                {
                    const index = this.topMoves.findIndex(object => object.move === match![1]);
                    if (index < 0)
                    {
                        console.assert(false, `The engine returned the best move "${match[1]}" but it's not in the top move list: `, this.topMoves);
                        debugger;
                    }
                    this.onTopMoves(this.topMoves[index], true);
                }

                this.isRequestedStop = false;
            }
        }
    }

    private MoveAndGo(FENs: string | null = null, isNewGame: boolean = true)
    {
        // let it go, let it gooo
        let go = () =>
        {
            this.lastTopMoves = isNewGame ? [] : this.topMoves;
            this.lastMoveScore = null;
            this.topMoves = [];

            if (isNewGame) this.isInTheory = ecoTable != null;

            if (this.isInTheory)
            {
                let shortFen = this.master.game.controller.getFEN().split(" ").slice(0, 3).join(" ");
                if (ecoTable!.get(shortFen) !== true) this.isInTheory = false;
            }

            if (FENs != null) this.send(`position fen ${FENs}`);
            this.go();
        };

        this.onReady(() =>
        {
            if (isNewGame)
            {
                this.send("ucinewgame");
                this.onReady(go);
            }
            else
            {
                go();
            }
        });
    }

    AnalyzeLastMove(): void
    {
        this.lastMoveScore = null;

        let lastMove = this.master.game.controller.getLastMove();
        if (lastMove === undefined) return;

        if (this.isInTheory)
        {
            this.lastMoveScore = "Book";
        }
        else if (this.lastTopMoves.length > 0)
        {
            let lastBestMove = this.lastTopMoves[0];

            // check if last move is the best move
            if (lastBestMove.from === lastMove.from && lastBestMove.to === lastMove.to)
            {
                this.lastMoveScore = "BestMove";
            }
            else
            {
                let bestMove = this.topMoves[0];

                if (lastBestMove.mate != null)
                {
                    // if last move is losing mate, this move just escapes a mate
                    // if last move is winning mate, this move is a missed win
                    if (bestMove.mate == null)
                    {
                        this.lastMoveScore = lastBestMove.mate > 0 ? "MissedWin" : "Brilliant";
                    } else
                    {
                        // both move are mate
                        this.lastMoveScore = lastBestMove.mate > 0 ? "Excellent" : "ResignWhite";
                    }
                }
                else if (bestMove.mate != null)
                {
                    // brilliant if it found a mate, blunder if it moved into a mate
                    this.lastMoveScore = bestMove.mate < 0 ? "Brilliant" : "Blunder";
                }
                else if (bestMove.cp != null && lastBestMove.cp != null)
                {
                    let evalDiff = -(bestMove.cp + lastBestMove.cp);

                    if (evalDiff > 100)
                        this.lastMoveScore = "Brilliant";
                    else if (evalDiff > 0) this.lastMoveScore = "GreatFind";
                    else if (evalDiff > -10) this.lastMoveScore = "BestMove";
                    else if (evalDiff > -25) this.lastMoveScore = "Excellent";
                    else if (evalDiff > -50) this.lastMoveScore = "Good";
                    else if (evalDiff > -100) this.lastMoveScore = "Inaccuracy";
                    else if (evalDiff > -250) this.lastMoveScore = "Mistake";
                    else this.lastMoveScore = "Blunder";

                } else
                {
                    console.assert(false, "Error while analyzing last move");
                }
            }
        }

        // add highlight and effect
        if (this.lastMoveScore != null)
        {
            const highlightColors: { [id: string]: string; } = {
                "Brilliant": "#1baca6",
                "GreatFind": "#5c8bb0",
                "BestMove": "#9eba5a",
                "Excellent": "#96bc4b",
                "Good": "#96af8b",
                "Book": "#a88865",
                "Inaccuracy": "#f0c15c",
                "Mistake": "#e6912c",
                "Blunder": "#b33430",
                "MissedWin": "#dbac16",
            };

            let hlColor = highlightColors[this.lastMoveScore];
            if (hlColor != null)
            {
                this.master.game.controller.markings.addOne({
                    data: {
                        opacity: 0.5,
                        color: hlColor,
                        square: lastMove.to,
                    },
                    node: true,
                    persistent: true,
                    type: "highlight",
                });
            }

            // this.master.game.controller.markings.removeOne(`effect|${lastMove.to}`);
            this.master.game.controller.markings.addOne({
                data: {
                    square: lastMove.to,
                    type: this.lastMoveScore,
                },
                node: true,
                persistent: true,
                type: "effect",
            });
        }
    }

    private onTopMoves(move: TopMove | null = null, isBestMove: boolean = false)
    {
        if (move != null)
        {
            const index = this.topMoves.findIndex(object => object.move === move.move);

            if (isBestMove)
            {
                // check if the best move returned from stockfish matches
                // with the best move in the list, bring it to the top of
                // the list if it doesn't match
                if (this.topMoves[0].move != move.move)
                {
                    this.topMoves.splice(index, 1);
                    this.topMoves.splice(0, 0, move);
                    // console.log(this.topMoves);
                }
            } else
            {
                if (index === -1)
                {
                    this.topMoves.push(move);
                    this.SortTopMoves();
                }
                else if (move.depth >= this.topMoves[index].depth)
                {
                    // only replace if this move has a higher depth than
                    // the one in the current top move list
                    this.topMoves[index] = move;
                    this.SortTopMoves();
                }
            }
        }


        let top_pv_moves = this.topMoves.slice(0, this.options["MultiPV"] as number);
        this.master.game.HintMoves(top_pv_moves, this.lastTopMoves, isBestMove);
        if (this.master.options.move_analysis) this.AnalyzeLastMove();

        if (this.master.options.auto_move && isBestMove && this.master.game.controller.getPlayingAs() == this.master.game.controller.getTurn())
        {
            let bestMove = top_pv_moves[0];
            let legalMoves = this.master.game.controller.getLegalMoves();
            const index = legalMoves.findIndex(move => move.from === bestMove.from && move.to == bestMove.to);

            console.assert(index !== -1, "Illegal best move");

            let moveData = legalMoves[index];
            moveData.userGenerated = true;

            if (bestMove.promotion != null)
                moveData.promotion = bestMove.promotion;

            // Anti-ban: Add random delay before making the move
            if (this.master.options.anti_ban_enabled)
            {
                const delay = this.GetAntiBanDelay();
                console.log(`Anti-ban: Delaying move by ${delay}ms`);
                setTimeout(() =>
                {
                    this.master.game.controller.move(moveData);
                }, delay);
            }
            else
            {
                this.master.game.controller.move(moveData);
            }
        }
    }

    private GetAntiBanDelay(): number
    {
        const options = this.master.options;
        if (!options.anti_ban_randomize)
        {
            return options.anti_ban_min_delay;
        }

        // Random delay between min and max
        const min = options.anti_ban_min_delay;
        const max = options.anti_ban_max_delay;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private SortTopMoves()
    {
        // sort the top move list to bring the best moves on top (index 0)
        this.topMoves.sort(function (a, b)
        {
            if (b.mate === null)
            {
                // this move is mate and the other is not
                if (a.mate !== null)
                {
                    // a negative mate value is a losing move
                    return a.mate < 0 ? 1 : -1
                }

                // both moves has no mate, compare the depth first than centipawn
                if (a.depth === b.depth)
                {
                    if (a.cp === b.cp) return 0;
                    return (a.cp as number) > (b.cp as number) ? -1 : 1;
                }

                return a.depth > b.depth ? -1 : 1;
            }
            else
            {
                // both this move and other move is mate
                if (a.mate !== null)
                {
                    // both losing move, which takes more moves is better
                    // both winning move, which takes less move is better
                    if ((a.mate < 0 && b.mate < 0) ||
                        (a.mate > 0 && b.mate > 0))
                    {
                        return a.mate < b.mate ? 1 : -1;
                    }

                    // comparing a losing move with a winning move, positive mate score is winning
                    return a.mate > b.mate ? -1 : 1;
                }

                return b.mate < 0 ? 1 : -1;
            }
        });
    }
}

class AutoPlayBall
{
    private ball: HTMLElement;
    private isDragging: boolean = false;
    private isAutoPlaying: boolean = false;
    private dragOffsetX: number = 0;
    private dragOffsetY: number = 0;
    private master: ChessMint;
    private opponentElo: number = 0;
    private eloLabel: HTMLElement;

    constructor(master: ChessMint)
    {
        this.master = master;
        this.ball = document.createElement("div");
        this.ball.className = "chessmint-autoplay-ball";
        this.ball.innerHTML = `
            <div class="chessmint-ball-icon">♟</div>
            <div class="chessmint-ball-status">Auto</div>
            <div class="chessmint-ball-elo">ELO: --</div>
        `;
        this.eloLabel = this.ball.querySelector(".chessmint-ball-elo") as HTMLElement;

        // Position the ball in the bottom-right corner
        this.ball.style.position = "fixed";
        this.ball.style.bottom = "20px";
        this.ball.style.right = "20px";
        this.ball.style.zIndex = "999999";
        this.ball.style.cursor = "grab";
        this.ball.style.width = "70px";
        this.ball.style.height = "70px";
        this.ball.style.borderRadius = "50%";
        this.ball.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
        this.ball.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
        this.ball.style.display = "flex";
        this.ball.style.flexDirection = "column";
        this.ball.style.alignItems = "center";
        this.ball.style.justifyContent = "center";
        this.ball.style.color = "white";
        this.ball.style.fontSize = "10px";
        this.ball.style.fontFamily = "Arial, sans-serif";
        this.ball.style.transition = "transform 0.2s, box-shadow 0.2s";
        this.ball.style.userSelect = "none";
        this.ball.style.border = "2px solid rgba(255,255,255,0.3)";

        // Ball icon styling
        let icon = this.ball.querySelector(".chessmint-ball-icon") as HTMLElement;
        icon.style.fontSize = "20px";
        icon.style.lineHeight = "1";

        // Status text styling
        let status = this.ball.querySelector(".chessmint-ball-status") as HTMLElement;
        status.style.fontSize = "9px";
        status.style.fontWeight = "bold";
        status.style.marginTop = "2px";

        // ELO label styling
        this.eloLabel.style.fontSize = "8px";
        this.eloLabel.style.marginTop = "1px";
        this.eloLabel.style.opacity = "0.8";

        // Make it draggable
        this.ball.addEventListener("mousedown", (e) => this.onMouseDown(e));
        document.addEventListener("mousemove", (e) => this.onMouseMove(e));
        document.addEventListener("mouseup", () => this.onMouseUp());

        // Click to toggle autoplay
        this.ball.addEventListener("click", (e) => this.onClick(e));

        document.body.appendChild(this.ball);
    }

    private onMouseDown(e: MouseEvent)
    {
        this.isDragging = false;
        const rect = this.ball.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        this.ball.style.cursor = "grabbing";
        this.ball.style.transition = "none";
    }

    private onMouseMove(e: MouseEvent)
    {
        if (e.buttons !== 1) return;
        if (!this.ball.style.transition || this.ball.style.transition === "none")
        {
            this.isDragging = true;
        }
        if (this.isDragging)
        {
            this.ball.style.left = (e.clientX - this.dragOffsetX) + "px";
            this.ball.style.top = (e.clientY - this.dragOffsetY) + "px";
            this.ball.style.right = "auto";
            this.ball.style.bottom = "auto";
        }
    }

    private onMouseUp()
    {
        this.ball.style.cursor = "grab";
        this.ball.style.transition = "transform 0.2s, box-shadow 0.2s";
        // Reset drag flag after a short delay to allow click detection
        setTimeout(() => { this.isDragging = false; }, 50);
    }

    private onClick(e: MouseEvent)
    {
        if (this.isDragging) return;
        this.toggleAutoPlay();
    }

    private toggleAutoPlay()
    {
        this.isAutoPlaying = !this.isAutoPlaying;
        this.master.options.auto_move = this.isAutoPlaying;

        if (this.isAutoPlaying)
        {
            this.ball.style.background = "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
            this.ball.style.boxShadow = "0 4px 20px rgba(245,87,108,0.5)";
            this.ball.style.animation = "chessmint-pulse 1.5s ease-in-out infinite";
            this.ball.querySelector(".chessmint-ball-status")!.textContent = "ON";
            this.detectOpponentElo();
        }
        else
        {
            this.ball.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
            this.ball.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
            this.ball.style.animation = "none";
            this.ball.querySelector(".chessmint-ball-status")!.textContent = "OFF";
        }

        // Save the auto_move setting
        chrome.storage.sync.set({ auto_move: this.isAutoPlaying });
    }

    private detectOpponentElo()
    {
        // Try to detect opponent ELO from the chess.com UI
        try
        {
            // Look for rating elements on chess.com
            let ratingElements = document.querySelectorAll(".rating-number, .user-rating, .player-rating");
            let ratings: number[] = [];
            ratingElements.forEach((el) =>
            {
                let text = el.textContent?.trim().replace(/[^0-9]/g, "");
                if (text && text.length > 2 && text.length < 5)
                {
                    let rating = parseInt(text);
                    if (rating > 400 && rating < 4000) ratings.push(rating);
                }
            });

            // Also try to find opponent username and look up their rating
            let opponentName = "";
            let playerNames = document.querySelectorAll(".username, .user-username, .player-name");
            let currentUser = (window as any).context?.user?.username || "";
            playerNames.forEach((el) =>
            {
                let name = el.textContent?.trim() || "";
                if (name && name !== currentUser && !opponentName)
                {
                    opponentName = name;
                }
            });

            if (ratings.length > 0)
            {
                // Use the highest rating found (likely the opponent's)
                this.opponentElo = Math.max(...ratings);
            }
            else
            {
                // Default to a reasonable estimate if we can't detect
                this.opponentElo = 1500;
            }

            this.eloLabel.textContent = `ELO: ${this.opponentElo}`;
            console.log(`ChessMint: Detected opponent ELO ~${this.opponentElo}`);

            // Adjust engine depth based on opponent strength for smarter play
            this.adjustEngineForOpponent();
        }
        catch (e)
        {
            console.log("ChessMint: Could not detect opponent ELO, using default");
            this.opponentElo = 1500;
            this.eloLabel.textContent = `ELO: ${this.opponentElo}`;
        }
    }

    private adjustEngineForOpponent()
    {
        // Make the engine play smarter based on opponent strength
        let depth = this.master.options.depth;
        let threads = this.master.options.threads;

        // Stronger opponents need deeper analysis
        if (this.opponentElo >= 2500)
        {
            depth = Math.max(depth, 20);
            threads = Math.max(threads, 4);
        }
        else if (this.opponentElo >= 2000)
        {
            depth = Math.max(depth, 18);
            threads = Math.max(threads, 3);
        }
        else if (this.opponentElo >= 1500)
        {
            depth = Math.max(depth, 15);
        }

        this.master.engine.depth = depth;
        console.log(`ChessMint: Engine adjusted - Depth: ${depth}, Threads: ${threads}`);
    }

    updateEloDisplay(elo: number)
    {
        this.opponentElo = elo;
        this.eloLabel.textContent = `ELO: ${elo}`;
    }

    remove()
    {
        this.ball.remove();
    }
}

class ChessMint
{
    engine: StockfishEngine;
    game: GameController;
    options: ExtensionOptions;
    private site: string;
    private autoPlayBall: AutoPlayBall | null = null;

    constructor(chessboard: HTMLElement, options: ExtensionOptions)
    {
        this.options = options;
        this.site = this.DetectSite();
        this.game = new GameController(this, chessboard);
        this.engine = new StockfishEngine(this);

        window.addEventListener("ChessMintUpdateOptions", (event) =>
        {
            this.options = (event as any).detail;
            this.game.UpdateExtensionOptions();
            this.engine.UpdateExtensionOptions();

            // show a notification when the settings is updated, but only if the previous notification has gone.
            if ((window as any).toaster.notifications.findIndex((noti: any) => noti.id == "chessmint-settings-updated") == -1)
            {
                (window as any).toaster.add({
                    id: "chessmint-settings-updated",
                    duration: 2000,
                    icon: "circle-gearwheel",
                    content: `Settings updated!`,
                })
            }

        }, false);

        // Create the draggable autoplay ball
        this.autoPlayBall = new AutoPlayBall(this);

        // If auto_move was enabled in settings, sync the ball state
        if (this.options.auto_move)
        {
            // The ball will be toggled on by the constructor's toggle
        }
    }

    onEngineLoaded()
    {
        (window as any).toaster.add({
            id: this.site,
            duration: 3000,
            icon: "circle-info",
            content: `ChessMint is enabled on ${this.site}!`,
        })
    }

    private DetectSite(): string
    {
        const hostname = window.location.hostname;
        if (hostname.includes('chess.com')) return 'chess.com';
        if (hostname.includes('worldchess.com')) return 'worldchess.com';
        if (hostname.includes('lichess.org')) return 'lichess.org';
        return 'unknown';
    }

    GetSite(): string
    {
        return this.site;
    }
}

var ChromeRequest = (function ()
{
    var requestId = 0;

    function getData(data?: any)
    {
        var id = requestId++;

        return new Promise(function (resolve, reject)
        {
            var listener = function (evt: any)
            {
                if (evt.detail.requestId == id)
                {
                    // Deregister self
                    window.removeEventListener("ChessMintSendOptions", listener);
                    resolve(evt.detail.data);
                }
            }

            window.addEventListener("ChessMintSendOptions", listener);

            var payload = { data: data, id: id };

            window.dispatchEvent(new CustomEvent("ChessMintGetOptions", { detail: payload }));
        });
    }

    return { getData: getData };
})();

function InitChessMint(chessboard: HTMLElement)
{
    fetch(Config.pathToEcoJson).then(async function (response)
    {
        let table = await response.json();
        ecoTable = new Map(table.map((data: any) => [data.f, true]));
    });

    // get the extension option first
    ChromeRequest.getData().then(function (options)
    {
        try
        {
            master = new ChessMint(chessboard, options as ExtensionOptions);
        } catch (e)
        {
            console.error(e);
            alert("Failed to load Chess Master");
        }
    });
}


// the site define a `chess-board` element as `class ChessBoard`
// when it got defined, we hook its `createGame` method to initalize our code
// all custom elements:
// -  "chess-board":          class ChessBoard
// -  "eco-opening":          class EcoOpening
// -  "evaluation-bar":       class EvaluationBar
// -  "evaluation-lines":     class EvaluationLines
// -  "horizontal-move-list": class HorizontalMoveList
// -  "vertical-move-list":   class VML
customElements.whenDefined("chess-board").then(function (ctor: CustomElementConstructor)
{
    ctor.prototype._createGame = ctor.prototype.createGame;
    ctor.prototype.createGame = function (e: any)
    {
        let result = this._createGame(e);
        InitChessMint(this);
        return result;
    }
});


function PostChatMessage(content: string): Promise<Response>
{
    let chat_area = document.querySelector(".resizable-chat-area-component") as any;
    let game_id = undefined;
    if (chat_area.__vue__.$vnode.context.liveGame != null)
    {
        game_id = chat_area.__vue__.$vnode.context.liveGame.uuid as string;
    } else
    {
        game_id = chat_area.__vue__.liveGame.uuid as string;
    }

    let user_id = context.user.uuid as string;
    let api = `https://services.chess.com/service/chat/game/${game_id}/players/messages?uid=${user_id}`

    let options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            content: content
        }),
        credentials: "include" as RequestCredentials
    }

    return fetch(api, options);
}

function testchat(content: string)
{

    let vue = (document.querySelector(".chat-room-component") as any).__vue__;
    vue.$emit("chat-input", { "text": content });
}