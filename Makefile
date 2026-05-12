UUID := monochrome-toggle@rangol.se
DOMAIN := monochrome-toggle
EXTENSION_DIR := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
ZIP := $(UUID).shell-extension.zip
BUILD_DIR := build
LOCALE_DIR := $(BUILD_DIR)/locale
PO_DIR := po
LINGUAS := ar bn de es fr hi id it ja ko nl pl pt ru sv tr zh
POT_FILE := $(PO_DIR)/$(DOMAIN).pot
PO_FILES := $(addprefix $(PO_DIR)/,$(addsuffix .po,$(LINGUAS)))
MO_FILES := $(foreach lang,$(LINGUAS),$(LOCALE_DIR)/$(lang)/LC_MESSAGES/$(DOMAIN).mo)
SCHEMA_DIR := schemas
SCHEMA_FILE := $(SCHEMA_DIR)/org.gnome.shell.extensions.monochrome-toggle.gschema.xml
COMPILED_SCHEMA := $(SCHEMA_DIR)/gschemas.compiled

SOURCES := extension.js profiles.js metadata.json README.md $(SCHEMA_FILE) $(PO_FILES)

.PHONY: all schemas translations update-pot package zip install uninstall enable disable reload clean distclean

all: schemas translations

schemas: $(COMPILED_SCHEMA)

$(COMPILED_SCHEMA): $(SCHEMA_FILE)
	glib-compile-schemas --strict $(SCHEMA_DIR)

translations: $(MO_FILES)

update-pot:
	install -d $(PO_DIR)
	xgettext --from-code=UTF-8 --language=JavaScript --keyword=_ \
		--package-name=$(DOMAIN) --output=$(POT_FILE) extension.js

$(LOCALE_DIR)/%/LC_MESSAGES/$(DOMAIN).mo: $(PO_DIR)/%.po
	install -d $(dir $@)
	msgfmt -o $@ $<

package zip: schemas translations
	rm -f $(ZIP)
	zip -r $(ZIP) extension.js profiles.js metadata.json README.md schemas \
		-x 'schemas/*.xml~' -x 'schemas/*.bak' -x 'schemas/gschemas.compiled'
	cd $(BUILD_DIR) && zip -r ../$(ZIP) locale

install: schemas translations
	install -d $(EXTENSION_DIR)/schemas
	install -m 0644 extension.js profiles.js metadata.json README.md $(EXTENSION_DIR)/
	install -m 0644 $(SCHEMA_FILE) $(COMPILED_SCHEMA) $(EXTENSION_DIR)/schemas/
	rm -rf $(EXTENSION_DIR)/locale
	cp -r $(LOCALE_DIR) $(EXTENSION_DIR)/locale

uninstall: disable
	rm -rf $(EXTENSION_DIR)

enable:
	gnome-extensions enable $(UUID)

disable:
	-gnome-extensions disable $(UUID)

reload: disable install enable

clean:
	rm -f $(COMPILED_SCHEMA)
	rm -rf $(BUILD_DIR)

distclean: clean
	rm -f $(ZIP)
