export interface CubeState {
  U: string[];
  D: string[];
  F: string[];
  B: string[];
  L: string[];
  R: string[];
}

export const getSolvedCube = (): CubeState => ({
  U: Array(9).fill('Y'), // Yellow
  D: Array(9).fill('W'), // White
  F: Array(9).fill('G'), // Green
  B: Array(9).fill('B'), // Blue
  L: Array(9).fill('O'), // Orange
  R: Array(9).fill('R'), // Red
});

// Rotate a 3x3 face clockwise
const rotateFaceCW = (face: string[]): string[] => [
  face[6], face[3], face[0],
  face[7], face[4], face[1],
  face[8], face[5], face[2]
];

// Rotate a 3x3 face counter-clockwise
const rotateFaceCCW = (face: string[]): string[] => [
  face[2], face[5], face[8],
  face[1], face[4], face[7],
  face[0], face[3], face[6]
];

// Apply a basic clockwise turn to the cube state
export const applyMoveCW = (cube: CubeState, move: string): CubeState => {
  const next = {
    U: [...cube.U],
    D: [...cube.D],
    F: [...cube.F],
    B: [...cube.B],
    L: [...cube.L],
    R: [...cube.R],
  };

  switch (move) {
    case 'U': {
      next.U = rotateFaceCW(next.U);
      const temp = [next.F[0], next.F[1], next.F[2]];
      next.F[0] = next.R[0]; next.F[1] = next.R[1]; next.F[2] = next.R[2];
      next.R[0] = next.B[0]; next.R[1] = next.B[1]; next.R[2] = next.B[2];
      next.B[0] = next.L[0]; next.B[1] = next.L[1]; next.B[2] = next.L[2];
      next.L[0] = temp[0];   next.L[1] = temp[1];   next.L[2] = temp[2];
      break;
    }
    case 'D': {
      next.D = rotateFaceCW(next.D);
      const temp = [next.F[6], next.F[7], next.F[8]];
      next.F[6] = next.L[6]; next.F[7] = next.L[7]; next.F[8] = next.L[8];
      next.L[6] = next.B[6]; next.L[7] = next.B[7]; next.L[8] = next.B[8];
      next.B[6] = next.R[6]; next.B[7] = next.R[7]; next.B[8] = next.R[8];
      next.R[6] = temp[0];   next.R[7] = temp[1];   next.R[8] = temp[2];
      break;
    }
    case 'R': {
      next.R = rotateFaceCW(next.R);
      const tempU = [next.U[2], next.U[5], next.U[8]];
      next.U[2] = next.F[2]; next.U[5] = next.F[5]; next.U[8] = next.F[8];
      next.F[2] = next.D[2]; next.F[5] = next.D[5]; next.F[8] = next.D[8];
      next.D[2] = next.B[6]; next.D[5] = next.B[3]; next.D[8] = next.B[0];
      next.B[6] = tempU[0];  next.B[3] = tempU[1];  next.B[0] = tempU[2];
      break;
    }
    case 'L': {
      next.L = rotateFaceCW(next.L);
      const tempU = [next.U[0], next.U[3], next.U[6]];
      next.U[0] = next.B[8]; next.U[3] = next.B[5]; next.U[6] = next.B[2];
      next.B[8] = next.D[0]; next.B[5] = next.D[3]; next.B[2] = next.D[6];
      next.D[0] = next.F[0]; next.D[3] = next.F[3]; next.D[6] = next.F[6];
      next.F[0] = tempU[0];  next.F[3] = tempU[1];  next.F[6] = tempU[2];
      break;
    }
    case 'F': {
      next.F = rotateFaceCW(next.F);
      const tempU = [next.U[6], next.U[7], next.U[8]];
      next.U[6] = next.L[8]; next.U[7] = next.L[5]; next.U[8] = next.L[2];
      next.L[8] = next.D[2]; next.L[5] = next.D[1]; next.L[2] = next.D[0];
      next.D[2] = next.R[0]; next.D[1] = next.R[3]; next.D[0] = next.R[6];
      next.R[0] = tempU[0];  next.R[3] = tempU[1];  next.R[6] = tempU[2];
      break;
    }
    case 'B': {
      next.B = rotateFaceCW(next.B);
      const tempU = [next.U[0], next.U[1], next.U[2]];
      next.U[0] = next.R[2]; next.U[1] = next.R[5]; next.U[2] = next.R[8];
      next.R[2] = next.D[8]; next.R[5] = next.D[7]; next.R[8] = next.D[6];
      next.D[8] = next.L[6]; next.D[7] = next.L[3]; next.D[6] = next.L[0];
      next.L[6] = tempU[2];  next.L[3] = tempU[1];  next.L[0] = tempU[0];
      break;
    }
  }

  return next;
};

// Apply a full move (including double or inverse turns)
export const applyMove = (cube: CubeState, rawMove: string): CubeState => {
  let move = rawMove.replace(/[()\[\]{}]/g, '').trim();
  if (!move) return cube;

  let state = cube;

  // Handle cube rotations x, y, z
  if (move === 'x') {
    state.R = rotateFaceCW(state.R);
    state.L = rotateFaceCCW(state.L);
    const tempU = [...state.U];
    state.U = [...state.F];
    state.F = [...state.D];
    state.D = [...state.B].reverse();
    state.B = tempU.reverse();
    return state;
  }
  if (move === "x'") {
    state.R = rotateFaceCCW(state.R);
    state.L = rotateFaceCW(state.L);
    const tempU = [...state.U];
    state.U = [...state.B].reverse();
    state.B = [...state.D].reverse();
    state.D = [...state.F];
    state.F = tempU;
    return state;
  }
  if (move === 'x2') {
    return applyMove(applyMove(cube, 'x'), 'x');
  }

  if (move === 'y') {
    state.U = rotateFaceCW(state.U);
    state.D = rotateFaceCCW(state.D);
    const tempF = [...state.F];
    state.F = [...state.R];
    state.R = [...state.B];
    state.B = [...state.L];
    state.L = tempF;
    return state;
  }
  if (move === "y'") {
    state.U = rotateFaceCCW(state.U);
    state.D = rotateFaceCW(state.D);
    const tempF = [...state.F];
    state.F = [...state.L];
    state.L = [...state.B];
    state.B = [...state.R];
    state.R = tempF;
    return state;
  }
  if (move === 'y2') {
    return applyMove(applyMove(cube, 'y'), 'y');
  }

  if (move === 'z') {
    state.F = rotateFaceCW(state.F);
    state.B = rotateFaceCCW(state.B);
    const tempU = [...state.U];
    state.U = rotateFaceCW([...state.L]);
    state.L = rotateFaceCW([...state.D]);
    state.D = rotateFaceCW([...state.R]);
    state.R = rotateFaceCW(tempU);
    return state;
  }
  if (move === "z'") {
    state.F = rotateFaceCCW(state.F);
    state.B = rotateFaceCW(state.B);
    const tempU = [...state.U];
    state.U = rotateFaceCCW([...state.R]);
    state.R = rotateFaceCCW([...state.D]);
    state.D = rotateFaceCCW([...state.L]);
    state.L = rotateFaceCCW(tempU);
    return state;
  }
  if (move === 'z2') {
    return applyMove(applyMove(cube, 'z'), 'z');
  }

  // Handle wide moves like r, u, f by decomposing them into standard moves + cube rotation
  if (move === 'r') {
    // r = R + L' + x
    return applyMove(applyMove(applyMove(state, 'R'), "L'"), 'x');
  }
  if (move === "r'") {
    return applyMove(applyMove(applyMove(state, "R'"), 'L'), "x'");
  }
  if (move === 'r2') {
    return applyMove(applyMove(cube, 'r'), 'r');
  }

  if (move === 'u') {
    return applyMove(applyMove(applyMove(state, 'U'), "D'"), 'y');
  }
  if (move === "u'") {
    return applyMove(applyMove(applyMove(state, "U'"), 'D'), "y'");
  }
  if (move === 'u2') {
    return applyMove(applyMove(cube, 'u'), 'u');
  }

  if (move === 'f') {
    return applyMove(applyMove(applyMove(state, 'F'), "B'"), 'z');
  }
  if (move === "f'") {
    return applyMove(applyMove(applyMove(state, "F'"), 'B'), "z'");
  }
  if (move === 'f2') {
    return applyMove(applyMove(cube, 'f'), 'f');
  }

  // Standard moves
  const baseMove = move.charAt(0).toUpperCase();
  const suffix = move.slice(1);

  if (suffix === '2' || suffix === "2'") {
    state = applyMoveCW(state, baseMove);
    state = applyMoveCW(state, baseMove);
  } else if (suffix === "'") {
    state = applyMoveCW(state, baseMove);
    state = applyMoveCW(state, baseMove);
    state = applyMoveCW(state, baseMove);
  } else {
    state = applyMoveCW(state, baseMove);
  }

  return state;
};

// Invert standard Rubik's cube algorithm moves
export const invertAlgorithm = (alg: string): string => {
  if (!alg) return '';
  // Clean brackets and parenthesis
  const clean = alg.replace(/[()\[\]{}]/g, ' ');
  const moves = clean.split(/\s+/).filter(Boolean);
  const inverted = moves.reverse().map(move => {
    if (move.endsWith("'")) {
      return move.slice(0, -1);
    } else if (move.endsWith('2')) {
      return move;
    } else if (move.endsWith("2'")) {
      return move.slice(0, -2) + '2';
    } else {
      return move + "'";
    }
  });
  return inverted.join(' ');
};

// Simulate an algorithm and get U, F, B, L, R top adjacent row colors
export const simulateAlgorithm = (recommendedAlg: string): CubeState => {
  let cube = getSolvedCube();
  if (!recommendedAlg) return cube;

  // We want to set up the case state on the cube
  // To do that, we apply the inverse of the recommended algorithm to a solved cube
  const inverseAlg = invertAlgorithm(recommendedAlg);
  const moves = inverseAlg.split(/\s+/).filter(Boolean);

  for (const move of moves) {
    cube = applyMove(cube, move);
  }

  return cube;
};
