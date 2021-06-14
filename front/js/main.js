const EMPTY = 0;
const ARROW = 1;
const WHITE_AMAZON = 2;
const BLACK_AMAZON = 3;

const move_sound = new Audio('sounds/move.ogg');


let trigger_animation = function(obj) {
    var _dummy = obj.clientHeight; // Read attribute to trigger animation.
}




let new_game = function(n) {
    let game = {
        // Game state.
        n: n,
        board: new Array(n).fill(EMPTY).map(() => new Array(n).fill(EMPTY)),
        white_turn: true,
        move_hist: [],

        // UI state.
        selected_amazon: null,
        selected_amazon_old_pos: null,
        dom_board: null,
        dom_grid: null,
        dom_amazons: null,
        dom_arrows: null,
    };

    // Initial position.
    const t = Math.floor(n/3);
    game.board[n-1-t][0] = game.board[n-1-t][n-1] = WHITE_AMAZON;
    game.board[n-1][t] = game.board[n-1][n-1-t] = WHITE_AMAZON;
    game.board[0][t] = game.board[0][n-1-t] = BLACK_AMAZON;
    game.board[t][0] = game.board[t][n-1] = BLACK_AMAZON;

    return game;
};

let new_game_ui = function(game, dom_board) {
    dom_board.insertAdjacentHTML('beforeend', '<div class="grid"></div>');
    let grid = dom_board.lastChild;
    dom_board.insertAdjacentHTML('beforeend', '<div class="amazons"></div>');
    let amazons = dom_board.lastChild;
    dom_board.insertAdjacentHTML('beforeend', '<div class="arrows"></div>');
    let arrows = dom_board.lastChild;

    let dom_grid = new Array(game.n).fill(null).map(() => new Array(game.n).fill(null));
    for (let row = 0; row < 10; ++row) {
        for (let col = 0; col < 10; ++col) {
            let color = ['whitechecker', 'blackchecker'][(row + col) % 2];
            let coord = '';
            if (col === 9) {
                coord += `<div class="coord rank">${10-row}</div>`;
            }
            if (row === 9) {
                let symbols = 'abcdefghij';
                coord += `<div class="coord file">${symbols[col]}</div>`;
            }
            grid.insertAdjacentHTML('beforeend', `<div class="field ${color}" data-row="${row}" data-col="${col}">${coord}</div>`);
            let field = grid.lastChild;
            field.addEventListener('mousedown', e => { on_click(e, game) });
            dom_grid[row][col] = field;

            if (game.board[row][col] === WHITE_AMAZON || game.board[row][col] === BLACK_AMAZON) {
                let amazoncolor = (game.board[row][col] === WHITE_AMAZON) ? 'white' : 'black';
                amazons.insertAdjacentHTML('beforeend', `<div class="${amazoncolor} amazon" data-row="${row}" data-col="${col}"></div>`);
                amazons.lastChild.addEventListener('mousedown', e => { on_click(e, game) });
            }
        }
    }

    game.dom_board = dom_board;
    game.dom_grid = dom_grid;
    game.dom_amazons = amazons;
    game.dom_arrows = arrows;
    update_game(game);
}






let visible = function(game, pos) {
    let [x, y] = pos;
    let out = [];
    for (var dx = -1; dx <= 1; ++dx) {
        for (var dy = -1; dy <= 1; ++dy) {
            if (dx === 0 && dy === 0) continue;

            for (var n = 1; n <= 10; ++n) {
                const px = x + dx*n;
                const py = y + dy*n;
                if (px < 0 || px >= game.n || py < 0 || py >= game.n ||
                    game.board[py][px] !== EMPTY) break;

                out.push([px, py]);
            }
        }
    }

    return out;
}


let clear_selection_highlights = function(game) {
    let cur_dests = game.dom_board.getElementsByClassName('move-dest');
    while (cur_dests.length > 0) { cur_dests[0].classList.remove('move-dest'); }
}

let set_selection_highlights = function(game, pos) {
    clear_selection_highlights(game);
    for (const [x, y] of visible(game, pos)) {
        game.dom_grid[y][x].classList.add('move-dest');
    }
}

let clear_selection = function(game) {
    if (game.selected_amazon != null && game.selected_amazon_old_pos != null) {
        let amazon = get_amazon(game, game.selected_amazon);
        let [oldx, oldy] = game.selected_amazon_old_pos;
        let [curx, cury] = game.selected_amazon;

        game.board[oldy][oldx] = game.board[cury][curx];
        game.board[cury][curx] = EMPTY;
        amazon.dataset.row = oldy;
        amazon.dataset.col = oldx;
    }

    game.selected_amazon = game.selected_amazon_old_pos = null;
    clear_selection_highlights(game);
}

let update_game = function(game) {
    if (game.white_turn) {
        game.dom_board.classList.remove('black-turn');
        game.dom_board.classList.add('white-turn');
    } else {
        game.dom_board.classList.remove('white-turn');
        game.dom_board.classList.add('black-turn');
    }

    // Highlight last move.
    let cur_last_move = game.dom_board.getElementsByClassName('last-move');
    while (cur_last_move.length > 0) { cur_last_move[0].classList.remove('last-move'); }
    if (game.move_hist.length > 0) {
        let [old_pos, new_pos, arrow_pos] = game.move_hist[game.move_hist.length - 1];
        let [oldx, oldy] = old_pos;
        let [newx, newy] = new_pos;
        let [arrowx, arrowy] = arrow_pos;
        game.dom_grid[oldy][oldx].classList.add('last-move');
        game.dom_grid[newy][newx].classList.add('last-move');
        game.dom_grid[arrowy][arrowx].classList.add('last-move');
    }
}

let get_amazon = function(game, pos) {
    for (const amazon of game.dom_amazons.getElementsByClassName('amazon')) {
        if (amazon.dataset.col == pos[0] && amazon.dataset.row == pos[1]) {
            return amazon;
        }
    }
    return null;
}


let get_arrow = function(game, pos) {
    for (const arrow of game.dom_arrows.getElementsByClassName('arrow')) {
        if (arrow.dataset.col == pos[0] && arrow.dataset.row == pos[1]) {
            return arrow;
        }
    }
    return null;
}

let on_click = function(e, game) {
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);

    const turn_amazon = game.white_turn ? WHITE_AMAZON : BLACK_AMAZON;
    if (game.board[row][col] === turn_amazon) {
        // Don't reselect the same piece.
        if (game.selected_amazon === null || !(game.selected_amazon[0] == col && game.selected_amazon[1] == row)) {
            clear_selection(game);
            set_selection_highlights(game, [col, row]);
            game.selected_amazon = [col, row];
        }
    } else if (game.selected_amazon !== null && game.selected_amazon_old_pos === null) {
        const vis = visible(game, game.selected_amazon);
        if (vis.some(p => p[0] === col && p[1] === row)) {
            // Move queen.
            move_sound.play();
            let [oldx, oldy] = game.selected_amazon;
            let amazon = get_amazon(game, game.selected_amazon);
            game.board[row][col] = game.board[oldy][oldx];
            game.board[oldy][oldx] = EMPTY;

            amazon.dataset.row = row;
            amazon.dataset.col = col;
            game.selected_amazon_old_pos = game.selected_amazon;
            game.selected_amazon = [col, row];
            set_selection_highlights(game, game.selected_amazon);
        } else {
            clear_selection(game);
        }
    } else if (game.selected_amazon !== null && game.selected_amazon_old_pos !== null) {
        const vis = visible(game, game.selected_amazon);
        if (vis.some(p => p[0] === col && p[1] === row)) {
            // Shoot!
            move_sound.play();
            let [ax, ay] = game.selected_amazon;
            game.dom_arrows.insertAdjacentHTML('beforeend', `<div class="arrow" data-row="${ay}" data-col="${ax}"></div>`);
            const arrow = game.dom_arrows.lastChild;
            trigger_animation(arrow);
            arrow.dataset.row = row;
            arrow.dataset.col = col;
            game.board[row][col] = ARROW;

            clear_selection_highlights(game);
            game.white_turn = !game.white_turn;
            game.move_hist.push([game.selected_amazon_old_pos, game.selected_amazon, [col, row], arrow]);
            game.selected_amazon = game.selected_amazon_old_pos = null;
        } else {
            clear_selection(game);
        }
    }

    update_game(game);
};


let undo_move = function(game) {
    if (game.move_hist.length > 0) {
        let [old_pos, new_pos, arrow_pos] = game.move_hist.pop();
        let [oldx, oldy] = old_pos;
        let [newx, newy] = new_pos;
        let [arrowx, arrowy] = arrow_pos;

        let amazon = get_amazon(game, new_pos);
        amazon.style.transitionDelay = "0.2s";
        amazon.dataset.col = oldx;
        amazon.dataset.row = oldy;
        trigger_animation(amazon);
        amazon.style.transitionDelay = "";

        game.board[oldy][oldx] = game.board[newy][newx];
        game.board[newy][newx] = EMPTY;
        game.board[arrowy][arrowx] = EMPTY;

        let arrow = get_arrow(game, arrow_pos);
        arrow.style.transitionDuration = "0.2s";
        arrow.dataset.col = newx;
        arrow.dataset.row = newy;
        setTimeout(function() {
            arrow.remove();
        }, 200);

        game.white_turn = !game.white_turn;
        update_game(game);
    }
}

document.addEventListener('DOMContentLoaded', function(event) {
    let game = new_game(10, 10);
    let dom_board = document.getElementById('main-board');
    new_game_ui(game, dom_board);
    document.getElementById('main-undobutton').addEventListener('click', e => { undo_move(game) });
});
