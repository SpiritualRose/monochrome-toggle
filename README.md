# Monochrome Toggle

[![GNOME Shell 49–50](https://img.shields.io/badge/GNOME%20Shell-49%E2%80%9350-4A86CF?logo=gnome&logoColor=white)](https://www.gnome.org/)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue)](https://www.gnu.org/licenses/gpl-3.0)
[![Fork of achroma](https://img.shields.io/badge/fork-achroma-lightgrey)](https://github.com/ktauchathuranga/achroma)

A GNOME Shell extension that adds a Quick Settings tile for desaturating and tinting the display.

Useful for reducing eye strain or improving focus.

## Profiles

| Profile | Description |
|---|---|
| Grayscale | Full desaturation |
| Desaturated | Subtle 70% desaturation |
| Sepia | Greyscale with a warm tan tint |

## Installation

```bash
git clone https://github.com/SpiritualRose/monochrome-toggle.git
cp -r monochrome-toggle ~/.local/share/gnome-shell/extensions/monochrome-toggle@rangol.se
glib-compile-schemas ~/.local/share/gnome-shell/extensions/monochrome-toggle@rangol.se/schemas/
```

Log out and back in (Wayland) or `Alt+F2`, `r`, Enter (X11), then enable:

```bash
gnome-extensions enable monochrome-toggle@rangol.se
```

## Usage

Open Quick Settings (top-right corner), tap the **Tint** pill to toggle the effect, or use the arrow to pick a profile.

## Requirements

GNOME Shell 49 or 50.

## Credit

Forked from [achroma](https://github.com/ktauchathuranga/achroma) by Ashan Chathuranga. This fork moves the indicator to Quick Settings and uses a smaller set of profiles.
