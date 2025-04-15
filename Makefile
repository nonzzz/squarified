ROLLUP = ./node_modules/.bin/rollup --config ./rollup.config.mts --configPlugin swc3

FLAGS += --bundle
FLAGS += --loader:.html=copy
FLAGS += --loader:.json=copy
FLAGS += --outdir=./display
FLAGS += --target=chrome51
FLAGS += ./dev/index.html
FLAGS += ./dev/data.json
FLAGS += ./dev/main.ts


bootstrap:
	@echo "Install dependiences"
	npm install -g corepack@latest --force
	corepack enable
	pnpm install


build-lib:
	@echo "Build library"
	$(ROLLUP)
	@echo "Copying type declarations"
	node -e "const fs = require('fs');\
	const t = fs.readFileSync('./global.d.ts', 'utf8'); \
	['./dist/index.d.ts', './dist/index.d.mts'].forEach(f => { \
		const d = fs.readFileSync(f, 'utf8'); \
		fs.writeFileSync(f, t + '\n\n' + d); \
	}); \
	"
	

build-pub: bootstrap
	@echo "Build publish"
	@$(MAKE) build-lib && $(MAKE) publish


dev-server:
	@echo "Start dev server"
	./node_modules/.bin/esbuild $(FLAGS) --define:LIVE_RELOAD=true --watch --servedir=./display

lint:
	@echo "Lint"
	./node_modules/.bin/eslint --fix .

dev-docs:
	./node_modules/.bin/tsx scripts/serve.ts

build-docs:
	./node_modules/.bin/tsx scripts/render.tsx

publish:
	@echo "Publishing package..."
	$(eval VERSION = $(shell awk -F'"' '/"version":/ {print $4}' package.json))
	$(eval TAG = $(shell echo $(VERSION) | awk -F'-' '{if (NF > 1) print $$2; else print ""}' | cut -d'.' -f1))
	$(eval FLAGS += $(shell \
		if [ "$(TAG)" != "" ]; then \
			echo "--tag $(TAG)"; \
		fi \
	))
	@npm publish $(FLAGS) --provenance