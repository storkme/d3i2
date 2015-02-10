#!/bin/bash

NODE=nodejs
CLASSES=(dh,wd,barbarian,crusader,monk,wizard)

for class in "${classes[@]}"
do
    $NODE d3i2-bootstrap.js get na
done