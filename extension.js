'use strict';

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { QuickMenuToggle, SystemIndicator } from 'resource:///org/gnome/shell/ui/quickSettings.js';

import { DEFAULT_PROFILES } from './profiles.js';

const TITLE = 'Tint';
const ICON_NAME = 'preferences-color-symbolic';
const DESAT_NAME = 'monochrome-toggle-desat';
const BC_NAME = 'monochrome-toggle-bc';
const SETTINGS_KEY_PROFILE = 'current-profile';
const DEFAULT_PROFILE_KEY = 'grayscale';
const TRANSITION_MS = 300;
const FRAME_MS = 16;

const STATE_KEYS = ['factor', 'br', 'bg', 'bb', 'cr', 'cg', 'cb'];
const NEUTRAL = Object.freeze({ factor: 0, br: 0, bg: 0, bb: 0, cr: 0, cg: 0, cb: 0 });

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

const TRANSLATIONS = {
    sv: {
        'Tint':        'Färgton',
        'Grayscale':   'Gråskala',
        'Desaturated': 'Omättad',
        'Sepia':       'Sepia',
    },
};

const LANG = (GLib.get_language_names() || [])
    .map(l => l.split('.')[0].split('_')[0])
    .find(lang => TRANSLATIONS[lang]) || null;

function _(str) {
    return TRANSLATIONS[LANG]?.[str] || str;
}

function profileToState(profile) {
    const b = profile.brightness || NEUTRAL;
    const c = profile.contrast || NEUTRAL;
    return {
        factor: profile.factor || 0,
        br: b.r || 0, bg: b.g || 0, bb: b.b || 0,
        cr: c.r || 0, cg: c.g || 0, cb: c.b || 0,
    };
}

const MonochromeToggle = GObject.registerClass(
    class MonochromeToggle extends QuickMenuToggle {
        _init(settings) {
            super._init({
                title: _(TITLE),
                iconName: ICON_NAME,
                toggleMode: true,
            });

            this._settings = settings;
            this._state = { ...NEUTRAL };
            this._scratch = { ...NEUTRAL };

            // Clutter applies effects in reverse-add order, so the last-added effect is innermost.
            // DESAT must be innermost (added last) so BC tints the desaturated output. Both stay
            // attached for the toggle's lifetime; adding effects on demand can leave mutter's frame
            // clock idle until something else triggers a redraw.
            this._desatEffect = new Clutter.DesaturateEffect({ factor: 0 });
            this._bcEffect = new Clutter.BrightnessContrastEffect();
            Main.uiGroup.add_effect_with_name(BC_NAME, this._bcEffect);
            Main.uiGroup.add_effect_with_name(DESAT_NAME, this._desatEffect);

            this.menu.setHeader(ICON_NAME, _(TITLE));
            this._profileSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this._profileSection);
            this._profileItems = {};
            this._buildProfileItems();

            this._settingsChangedId = this._settings.connect(
                `changed::${SETTINGS_KEY_PROFILE}`,
                () => {
                    this._updateOrnaments();
                    this._updateSubtitle();
                    this._animateToTarget();
                });

            this.connect('notify::checked', () => {
                this._animateToTarget();
                this._updateSubtitle();
            });
        }

        _buildProfileItems() {
            const currentKey = this._settings.get_string(SETTINGS_KEY_PROFILE);
            for (const [key, profile] of Object.entries(DEFAULT_PROFILES)) {
                const item = new PopupMenu.PopupMenuItem(_(profile.name));
                if (key === currentKey)
                    item.setOrnament(PopupMenu.Ornament.DOT);
                item.connect('activate', () => {
                    this._settings.set_string(SETTINGS_KEY_PROFILE, key);
                    this.checked = true;
                });
                this._profileItems[key] = item;
                this._profileSection.addMenuItem(item);
            }
        }

        _updateOrnaments() {
            const currentKey = this._settings.get_string(SETTINGS_KEY_PROFILE);
            for (const [key, item] of Object.entries(this._profileItems))
                item.setOrnament(key === currentKey ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
        }

        _updateSubtitle() {
            this.subtitle = this.checked ? _(this._getCurrentProfile().name) : null;
        }

        _getCurrentProfile() {
            const key = this._settings.get_string(SETTINGS_KEY_PROFILE);
            return DEFAULT_PROFILES[key] || DEFAULT_PROFILES[DEFAULT_PROFILE_KEY];
        }

        _targetState() {
            if (!this.checked) return NEUTRAL;
            return profileToState(this._getCurrentProfile());
        }

        _applyState(s) {
            Object.assign(this._state, s);
            this._desatEffect.factor = s.factor;
            this._bcEffect.set_brightness_full(s.br, s.bg, s.bb);
            this._bcEffect.set_contrast_full(s.cr, s.cg, s.cb);
        }

        _stopAnimation() {
            if (this._animationId) {
                GLib.source_remove(this._animationId);
                this._animationId = 0;
            }
        }

        // Animation runs off the GLib main loop. On an idle Wayland desktop mutter's frame clock
        // pauses when nothing is drawing, which would stall a frame-clock-tied animation. Each
        // tick sets the effect properties and queues a redraw to schedule the next frame.
        _animateToTarget() {
            const start = { ...this._state };
            const end = this._targetState();

            if (STATE_KEYS.every(k => start[k] === end[k])) return;

            this._stopAnimation();

            const startTime = GLib.get_monotonic_time();
            const durationUs = TRANSITION_MS * 1000;

            this._animationId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, FRAME_MS, () => {
                const elapsed = GLib.get_monotonic_time() - startTime;
                const t = Math.min(elapsed / durationUs, 1);
                const eased = easeOutCubic(t);

                const s = this._scratch;
                for (const k of STATE_KEYS) s[k] = lerp(start[k], end[k], eased);
                this._applyState(s);
                Main.uiGroup.queue_redraw();

                if (t >= 1) {
                    this._animationId = 0;
                    return GLib.SOURCE_REMOVE;
                }
                return GLib.SOURCE_CONTINUE;
            });
        }

        destroy() {
            this._stopAnimation();
            if (this._settingsChangedId) {
                this._settings.disconnect(this._settingsChangedId);
                this._settingsChangedId = 0;
            }
            if (this._desatEffect) {
                Main.uiGroup.remove_effect(this._desatEffect);
                this._desatEffect = null;
            }
            if (this._bcEffect) {
                Main.uiGroup.remove_effect(this._bcEffect);
                this._bcEffect = null;
            }
            super.destroy();
        }
    });

const MonochromeIndicator = GObject.registerClass(
    class MonochromeIndicator extends SystemIndicator {
        _init(settings) {
            super._init();
            this._toggle = new MonochromeToggle(settings);
            this.quickSettingsItems.push(this._toggle);
        }
    });

export default class MonochromeToggleExtension extends Extension {
    enable() {
        this._indicator = new MonochromeIndicator(this.getSettings());
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.quickSettingsItems.forEach(item => item.destroy());
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
