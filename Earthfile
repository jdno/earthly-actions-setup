VERSION 0.8

# This project's continuous integration pipeline executes all Earthly targets
# that start with the prefixes `check-`, `format-`, `lint-`, and `test-`. Fixing
# formatting issues is disabled to prevent parallely running targets from
# overwriting each other's changes.
checks:
    BUILD +build
    BUILD +check-artifact
    BUILD +format-json --FIX="false"
    BUILD +format-markdown --FIX="false"
    BUILD +format-yaml --FIX="false"
    BUILD +lint-markdown
    BUILD +lint-typescript
    BUILD +lint-yaml
    BUILD +test-action
    BUILD +test-typescript

# These targets get executed by pre-commit before every commit. Some need to be
# run sequentially to avoid overwriting each other's changes.
pre-commit:
    WAIT
        BUILD +prettier
    END
    BUILD +check-artifact
    BUILD +lint-markdown
    BUILD +lint-yaml
    BUILD +test-action
    BUILD +test-typescript

build:
    DO ./.earthly/typescript+BUILD

check-artifact:
    DO ./.earthly/typescript+DIFF_ARTIFACT

format-json:
    ARG FIX="false"
    DO ./.earthly/prettier+PRETTIER --EXTENSION="{json,json5}" --FIX="$FIX"

format-markdown:
    ARG FIX="false"
    DO ./.earthly/prettier+PRETTIER --EXTENSION="md" --FIX="$FIX"

format-yaml:
    ARG FIX="false"
    DO ./.earthly/prettier+PRETTIER --EXTENSION="{yaml,yml}" --FIX="$FIX"

lint-markdown:
    DO ./.earthly/markdown+LINT

lint-typescript:
    DO ./.earthly/typescript+LINT

lint-yaml:
    DO ./.earthly/yaml+LINT

prettier:
    ARG FIX="false"
    DO ./.earthly/prettier+PRETTIER --FIX="$FIX"

test-action:
    DO ./.earthly/typescript+TEST_ACTION

test-typescript:
    DO ./.earthly/typescript+TEST
