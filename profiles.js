'use strict';

export const DEFAULT_PROFILES = {
    'grayscale':   { name: 'Grayscale',   factor: 1.0 },
    'desaturated': { name: 'Desaturated', factor: 0.7 },
    'sepia':       { name: 'Sepia',       factor: 1.0,
                     brightness: { r:  0.15, g:  0.05, b: -0.10 },
                     contrast:   { r:  0.00, g:  0.00, b:  0.00 } },
};
