ROLLDOWN = ./node_modules/.bin/rolldown --config ./rolldown.config.mts

FLAGS += --bundle
FLAGS += --loader:.html=copy
FLAGS += --loader:.json=copy
FLAGS += --outdir=./display
FLAGS += --target=chrome51
FLAGS += ./dev/index.html
FLAGS += ./dev/data.json
FLAGS += ./dev/main.ts

RELEASE_FLAGS += --access public


bootstrap:
	@echo "Install dependiences"
	npm install -g corepack@latest --force
	corepack enable
	pnpm install


build-lib:
	@echo "Build library"
	$(ROLLDOWN)

analyze-lib:
	@echo "Analyze library"
	export ANALYZE=1 && $(ROLLDOWN)
	
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
	$(eval RELEASE_FLAGS += $(shell \
		if [ "$(TAG)" != "" ]; then \
			echo "--tag $(TAG)"; \
		fi \
	))
	@npm publish $(RELEASE_FLAGS) --provenance
