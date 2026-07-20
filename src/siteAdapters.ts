// Site adapters for multi-site support

interface SiteAdapter {
    name: string;
    detectSite(): boolean;
    initialize(chessboard: HTMLElement): void;
    getGameController(chessboard: HTMLElement): any;
    getFEN(): string;
    getTurn(): number;
    getPlayingAs(): number;
    getLegalMoves(): any[];
    getLastMove(): any;
    makeMove(move: any): void;
    onMove(callback: (event: any) => void): void;
    onModeChanged(callback: (event: any) => void): void;
    onUpdateOptions(callback: (event: any) => void): void;
}

// Chess.com adapter (original implementation)
class ChessComAdapter implements SiteAdapter {
    name: string = 'chess.com';
    private controller: any = null;
    private moveCallback: ((event: any) => void) | null = null;
    private modeChangedCallback: ((event: any) => void) | null = null;
    private updateOptionsCallback: ((event: any) => void) | null = null;

    detectSite(): boolean {
        return window.location.hostname.includes('chess.com');
    }

    initialize(chessboard: HTMLElement): void {
        // Chess.com uses custom elements, already handled by the main code
        this.controller = (chessboard as any).game;
    }

    getGameController(chessboard: HTMLElement): any {
        return (chessboard as any).game;
    }

    getFEN(): string {
        return this.controller.getFEN();
    }

    getTurn(): number {
        return this.controller.getTurn();
    }

    getPlayingAs(): number {
        return this.controller.getPlayingAs();
    }

    getLegalMoves(): any[] {
        return this.controller.getLegalMoves();
    }

    getLastMove(): any {
        return this.controller.getLastMove();
    }

    makeMove(move: any): void {
        this.controller.move(move);
    }

    onMove(callback: (event: any) => void): void {
        this.moveCallback = callback;
        this.controller.on('Move', callback);
    }

    onModeChanged(callback: (event: any) => void): void {
        this.modeChangedCallback = callback;
        this.controller.on('ModeChanged', callback);
    }

    onUpdateOptions(callback: (event: any) => void): void {
        this.updateOptionsCallback = callback;
        this.controller.on('UpdateOptions', callback);
    }
}

// WorldChess.com adapter
class WorldChessAdapter implements SiteAdapter {
    name: string = 'worldchess.com';
    private controller: any = null;
    private moveCallback: ((event: any) => void) | null = null;
    private modeChangedCallback: ((event: any) => void) | null = null;
    private updateOptionsCallback: ((event: any) => void) | null = null;

    detectSite(): boolean {
        return window.location.hostname.includes('worldchess.com');
    }

    initialize(chessboard: HTMLElement): void {
        // WorldChess.com uses the same chess-board custom element as chess.com
        this.controller = (chessboard as any).game;
    }

    getGameController(chessboard: HTMLElement): any {
        return (chessboard as any).game;
    }

    getFEN(): string {
        return this.controller.getFEN();
    }

    getTurn(): number {
        return this.controller.getTurn();
    }

    getPlayingAs(): number {
        return this.controller.getPlayingAs();
    }

    getLegalMoves(): any[] {
        return this.controller.getLegalMoves();
    }

    getLastMove(): any {
        return this.controller.getLastMove();
    }

    makeMove(move: any): void {
        this.controller.move(move);
    }

    onMove(callback: (event: any) => void): void {
        this.moveCallback = callback;
        this.controller.on('Move', callback);
    }

    onModeChanged(callback: (event: any) => void): void {
        this.modeChangedCallback = callback;
        this.controller.on('ModeChanged', callback);
    }

    onUpdateOptions(callback: (event: any) => void): void {
        this.updateOptionsCallback = callback;
        this.controller.on('UpdateOptions', callback);
    }
}

// Lichess.org adapter
class LichessAdapter implements SiteAdapter {
    name: string = 'lichess.org';
    private board: any = null;
    private controller: any = null;
    private moveCallback: ((event: any) => void) | null = null;
    private modeChangedCallback: ((event: any) => void) | null = null;
    private updateOptionsCallback: ((event: any) => void) | null = null;

    detectSite(): boolean {
        return window.location.hostname.includes('lichess.org');
    }

    initialize(chessboard: HTMLElement): void {
        // Lichess uses a different board structure
        // Try to find the lichess board controller
        this.board = this.findLichessBoard();
        if (this.board) {
            this.controller = this.board.chess;
        }
    }

    private findLichessBoard(): any {
        // Lichess board is typically in .board or cg-board element
        const boardElement = document.querySelector('.board') as any;
        if (boardElement && boardElement.lichess) {
            return boardElement.lichess;
        }
        
        // Try to find via the global lichess object
        if ((window as any).lichess && (window as any).lichess.board) {
            return (window as any).lichess.board;
        }
        
        return null;
    }

    getGameController(chessboard: HTMLElement): any {
        return this.controller;
    }

    getFEN(): string {
        if (!this.controller) return '';
        // Lichess uses a different API
        if (this.controller.getFen) {
            return this.controller.getFen();
        }
        return '';
    }

    getTurn(): number {
        if (!this.controller) return 1;
        // Lichess: 'white' or 'black'
        const turn = this.controller.turn();
        return turn === 'white' ? 1 : 2;
    }

    getPlayingAs(): number {
        if (!this.controller) return 1;
        const color = this.controller.color();
        return color === 'white' ? 1 : 2;
    }

    getLegalMoves(): any[] {
        if (!this.controller) return [];
        // Convert lichess moves to standard format
        const moves = this.controller.moves({ verbose: true });
        return moves.map((move: any) => ({
            from: move.from,
            to: move.to,
            san: move.san,
            promotion: move.promotion || undefined
        }));
    }

    getLastMove(): any {
        if (!this.controller) return undefined;
        const history = this.controller.history({ verbose: true });
        if (history.length === 0) return undefined;
        
        const lastMove = history[history.length - 1];
        return {
            from: lastMove.from,
            to: lastMove.to,
            san: lastMove.san,
            fen: this.getFEN()
        };
    }

    makeMove(move: any): void {
        if (!this.controller) return;
        
        // Convert to lichess move format
        const lichessMove = {
            from: move.from,
            to: move.to,
            promotion: move.promotion
        };
        
        this.controller.move(lichessMove);
    }

    onMove(callback: (event: any) => void): void {
        this.moveCallback = callback;
        // Lichess uses 'change' event
        if (this.board) {
            this.board.on('change', () => {
                callback({ data: this.getLastMove() });
            });
        }
    }

    onModeChanged(callback: (event: any) => void): void {
        this.modeChangedCallback = callback;
        // Lichess doesn't have a direct mode changed event
        // We can monitor game state changes
        if (this.board) {
            this.board.on('state', (state: any) => {
                callback({ data: state });
            });
        }
    }

    onUpdateOptions(callback: (event: any) => void): void {
        this.updateOptionsCallback = callback;
        // Lichess doesn't have this event, but we can call it manually if needed
    }
}

// Site adapter factory
class SiteAdapterFactory {
    private adapters: SiteAdapter[] = [
        new ChessComAdapter(),
        new WorldChessAdapter(),
        new LichessAdapter()
    ];

    getAdapter(): SiteAdapter | null {
        for (const adapter of this.adapters) {
            if (adapter.detectSite()) {
                return adapter;
            }
        }
        return null;
    }

    getSupportedSites(): string[] {
        return this.adapters.map(a => a.name);
    }
}

// Export singleton
export const siteAdapterFactory = new SiteAdapterFactory();