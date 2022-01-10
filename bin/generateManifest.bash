#!/bin/bash

find build -type f -name *.js -not -name "*Bitburner*" | sed -e 's#build#.#' > build/resources/manifest.txt
