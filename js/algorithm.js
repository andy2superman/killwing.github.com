'use strict';

const WIDTH = 640;
const HEIGHT = 360;
const N = 20;
const SPEED = 1000;

// http://clrs.cc/
const COLOR = {
    UNSORTED: '#FF4136',
    SORTED: '#2ECC40',
    INACTIVE: '#DDDDDD',
    LEFT: '#01FF70',
    RIGHT: '#3D9970'
};

function VisData() {
    this.bars = [];
    this.values = [];
    this.length = N;
    for (let i = 0; i < N; ++i) {
        let b = {};
        b.w = WIDTH / N - 1;
        b.h = Math.random() * HEIGHT;
        b.x = i * (WIDTH / N);
        b.y = HEIGHT - b.h;
        b.s = 'UNSORTED';
        b.a = true; // active

        this.bars.push(b);
        this.values.push(b);
    }
}
VisData.prototype.swap = function(i, j) {
    if (i == j) {
        return;
    }

    // swap pos first
    let temp = this.values[i].x;
    this.values[i].x = this.values[j].x;
    this.values[j].x = temp;

    // swap the bar referenced
    temp = this.values[i];
    this.values[i] = this.values[j];
    this.values[j] = temp;
};
VisData.prototype.get = function(i) {
    return this.values[i];
};
VisData.prototype.less = function(i, j) {
    return this.values[i].h < this.values[j].h;
};
VisData.prototype.greaterValue = function(i, v) {
    return this.values[i].h > v.h;
};
VisData.prototype.assign = function(i, j) {
    if (this.emptyX !== undefined) {
        let newEmptyX = this.values[j].x;
        this.values[j].x = this.emptyX;
        this.emptyX = newEmptyX;
        this.values[i] = this.values[j];
    } else {
        this.emptyX = this.values[j].x; // save empty pos
        this.values[j].x = this.values[i].x;
        this.values[i] = this.values[j];
    }
};
VisData.prototype.assignValue = function(i, v) {
    if (this.emptyX !== undefined) {
        v.x = this.emptyX;
        this.values[i] = v;
        this.emptyX = undefined;
    } // else no empty pos, other value can not be assigned
};
VisData.prototype.setState = function(e) {
    if (e.s == 'GROUP') {
        this.values.forEach(function(value, i) {
            value.a = e.a(i);
        });
    } else {
        if (e.i instanceof Array) { // set range
            for (var i = e.i[0]; i <= e.i[1]; ++i) {
                this.values[i].s = e.s;
                this.values[i].a = e.a();
            };
        } else {
            this.values[e.i].s = e.s;
        }
    }
};

function VisWidget(sort) {
    this.svg = d3.select('#'+sort.name).attr('width', WIDTH).attr('height', HEIGHT);
    this.speed = SPEED;
    this.sort = sort;

    this.init();

    // init draw
    this.svg.selectAll('rect')
        .data(this.data.bars)
        .enter()
        .append('rect')
        .attr('x', function(d, i) { return d.x; })
        .attr('y', function(d, i) { return d.y; })
        .attr('width', function(d, i) { return d.w; })
        .attr('height', function(d, i) { return d.h; })
        .attr('fill', COLOR.UNSORTED);

    // controls
    let svgElem = document.getElementById(sort.name);
    let resetBtn = document.createElement('button');
    resetBtn.innerHTML = 'RESET';
    resetBtn.onclick = this.onReset.bind(this);
    svgElem.parentNode.insertBefore(resetBtn, svgElem.nextSibling);

    let stepBtn = document.createElement('button');
    stepBtn.innerHTML = 'STEP';
    stepBtn.onclick = this.onStep.bind(this);
    svgElem.parentNode.insertBefore(stepBtn, svgElem.nextSibling);

    let playBtn = document.createElement('button');
    playBtn.innerHTML = 'PLAY';
    playBtn.onclick = this.onPlay.bind(this);
    svgElem.parentNode.insertBefore(playBtn, svgElem.nextSibling);
}
VisWidget.prototype.init = function() {
    this.data = new VisData;
    this.gen = new this.sort(this.data);
};
VisWidget.prototype.update = function() {
    let ret = this.gen.next();
    if (ret.done) {
        this.done();
        return;
    }

    // update state
    this.data.setState(ret.value);

    // redraw
    this.svg.selectAll('rect')
        .data(this.data.bars)
        .transition()
        .duration(SPEED)
        .attr('x', function(d, i) { return d.x; })
        .attr('y', function(d, i) { return d.y; })
        .attr('width', function(d, i) { return d.w; })
        .attr('height', function(d, i) { return d.h; })
        .attr('fill', function(d, i) { return d.a ? COLOR[d.s] : COLOR.INACTIVE; })
};
VisWidget.prototype.onPlay = function() {
    if (!this.timerId) {
        this.timerId = setInterval(this.update.bind(this), this.speed);
    }
};
VisWidget.prototype.onStep = function() {
    // stop play first
    if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
    } else {
        this.update();
    }
};
VisWidget.prototype.onReset = function() {
    clearInterval(this.timerId);
    this.timerId = null;
    this.init();

    this.svg.selectAll('rect')
        .data(this.data.bars)
        .attr('x', function(d, i) { return d.x; })
        .attr('y', function(d, i) { return d.y; })
        .attr('width', function(d, i) { return d.w; })
        .attr('height', function(d, i) { return d.h; })
        .attr('fill', COLOR.UNSORTED);
};
VisWidget.prototype.done = function() {
    clearInterval(this.timerId);
    this.timerId = null;
    this.svg.selectAll('rect').attr('fill', COLOR.SORTED);
};

function *selection(a) {
    for (let i = 0; i != a.length-1; ++i) {
        let min = i;
        for (let j = i+1; j != a.length; ++j) {
            if (a.less(j, min)) {
                min = j;
            }
        }
        a.swap(i, min);
        yield {i: i, s: 'SORTED'};
    }
}
new VisWidget(selection);

function *insertion(a) {
    yield {i: 0, s: 'SORTED'}; // the 1st one is always sorted, change state for it
    for (let i = 1; i != a.length; ++i) {
        let insert = a.get(i);
        let j = i;
        for (; j > 0; --j) {
            if (a.greaterValue(j-1, insert)) {
                a.assign(j, j-1);
            } else {
                break;
            }
        }
        a.assignValue(j, insert);
        yield {i: j, s: 'SORTED'};
    }
}
new VisWidget(insertion);

function *shell(a) {
    let d = 1;
    while (d < a.length/3) {
        d = 3 * d + 1; // 1, 4, 13, 40
    }

    while (d) {
        yield {i: [0, a.length-1], s: 'UNSORTED', a: function() {
            return (d == 1) ? true : false;
        }}; // reset state

        for (let i = d; i != a.length; ++i) {
            if (d != 1) {
                yield {s: 'GROUP', a: function(index) {
                    return (index - i % d) % d == 0;
                }}; // focus current group
            }
            if (i - d < d) {
                yield {i: i-d, s: 'SORTED'}; // make 1st of group sorted
            }

            let insert = a.get(i);
            let j = i;
            for (; j >= d; j -= d) {
                if (a.greaterValue(j-d, insert)) {
                    a.assign(j, j-d);
                } else {
                    break;
                }
            }

            a.assignValue(j, insert);
            yield {i: j, s: 'SORTED'};
        }

        d = Math.floor(d/3);
    }
};
new VisWidget(shell);

function *quick(a, l, r) {
    l = (l == undefined) ? 0 : l;
    r = (r == undefined) ? a.length-1 : r;

    yield {i: [l, r], s: 'UNSORTED', a: function() { return true; }}; // reset state

    var m = l;
    for (var i = l+1; i <= r; ++i) {
        if (a.less(i, l)) {
            ++m;
            a.swap(i, m);
            yield {i: m, s: 'LEFT'};
        } else {
            yield {i: i, s: 'RIGHT'};
        }
    }
    a.swap(l, m);
    yield {i: m, s: 'SORTED'};

    if (l < m-1) {
        yield *quick(a, l, m-1);
    } else {
        yield {i: l, s: 'SORTED'};
    }

    if (m+1 < r) {
        yield *quick(a, m+1, r);
    } else {
        yield {i: r, s: 'SORTED'};
    }
};
new VisWidget(quick);
