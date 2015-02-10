#!/bin/bash

NODE=nodejs

for clss in dh wd barbarian crusader monk wizard; do
    $NODE d3i2-bootstrap.js get $1 $clss
done