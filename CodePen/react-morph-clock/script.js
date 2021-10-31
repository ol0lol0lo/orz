const { useState, useEffect } = React;

// small circle radius
const r1 = 5;
const r2 = 10;
const r3 = 15;
const width = window.innerWidth;
const height = window.innerHeight;

const minWH = Math.min(width, height);

let maxSize;
if (minWH < 430) {
  maxSize = minWH - 30;
} else {
  maxSize = 400;
}

// utils
// deg to radian
const rad = a => Math.PI * (a - 90) / 180;

// relative polar coordinates
const rx = (r, a, c) => c + r * Math.cos(rad(a, c));

const ry = (r, a, c) => c + r * Math.sin(rad(a));

// get hours, minutes, and seconds
const HMS = t => ({
  h: t.getHours(),
  m: t.getMinutes(),
  s: t.getSeconds() });


const pathStringVars = (c, r, time) => {
  // center, radius and time = this.props
  // const {c,r,time} = p
  const { h, m, s } = HMS(time);

  // divide 360 deg by 12hrs, 60min, and 60s
  const hAngFact = 30;
  const mAngFact = 6;
  const sAngFact = 6;

  // calc relative coordinates
  const hx = rx(r - 30, hAngFact * h, c);
  const hy = ry(r - 30, hAngFact * h, c);
  const mx = rx(r - 30, mAngFact * m, c);
  const my = ry(r - 30, mAngFact * m, c);
  const sx = rx(r - 30, sAngFact * s, c);
  const sy = ry(r - 30, sAngFact * s, c);

  return { hx, hy, mx, my, sx, sy };
};

const TextTime = ({ x, y, time }) => {
  const str = time.toTimeString().slice(0, 8).replace(/:/g, " : ");
  return /*#__PURE__*/(
    React.createElement("text", { x: x, y: y, className: "textTime" },
    str));


};

// Circle component
const Circle = ({ cx, cy, radius, className }) => /*#__PURE__*/
React.createElement("circle", { cx: cx, cy: cy, r: radius, className: className });


// Single spike
const Spike = ({ x1, x2, y1, y2 }) => /*#__PURE__*/
React.createElement("line", { className: "spike", x1: x1, x2: x2, y1: y1, y2: y2 });


const spikeNodes = (c, radius) => {
  const increment = 30;
  const nodes = [];

  for (let i = 1; i < 13; i++) {
    let ang = i * increment;

    let temp = /*#__PURE__*/
    React.createElement(Spike, {
      x1: rx(radius - 5, ang, c),
      x2: rx(radius - 10, ang, c),
      y1: ry(radius - 5, ang, c),
      y2: ry(radius - 10, ang, c),
      key: i });


    nodes.push(temp);
  }
  return nodes;
};

// populate Spikes
const Spikes = ({ c, radius }) => /*#__PURE__*/React.createElement("g", null, spikeNodes(c, radius));

// triangle component
const Triangle = ({ c, r, time }) => {
  const { hx, hy, mx, my, sx, sy } = pathStringVars(c, r, time);
  const path = `M${hx},${hy} L${mx},${my} L${sx},${sy} L${hx},${hy}`;
  return /*#__PURE__*/React.createElement("path", { className: "triangle", d: path });
};

// Secondary circles
const SecCircle = ({ c, r, time }) => {
  const { hx, hy, mx, my, sx, sy } = pathStringVars(c, r, time);
  return /*#__PURE__*/(
    React.createElement("g", null, /*#__PURE__*/
    React.createElement(Circle, { className: "secCircle", cx: hx, cy: hy, radius: r3 }), /*#__PURE__*/
    React.createElement(Circle, { className: "secCircle", cx: mx, cy: my, radius: r2 }), /*#__PURE__*/
    React.createElement(Circle, { className: "secCircle", cx: sx, cy: sy, radius: r1 })));


};

// main container
const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    window.setInterval(() => {
      setTime(new Date());
    }, 1000);
  }, []);

  const size = maxSize;

  const viewBox = `0 0 ${size} ${size}`;

  const mid = size / 2;

  const paddedRadius = (size - 30) / 2;

  return /*#__PURE__*/(
    React.createElement("svg", {
      xmlns: "http://www.w3.org/svg/2000",
      viewBox: viewBox,
      width: size,
      height: size }, /*#__PURE__*/

    React.createElement(Circle, { className: "outerRing", cx: mid, cy: mid, radius: mid - 5 }), /*#__PURE__*/
    React.createElement(Circle, { className: "primCircle", cx: mid, cy: mid, radius: mid - 15 }), /*#__PURE__*/
    React.createElement(Spikes, { c: mid, radius: paddedRadius }), /*#__PURE__*/
    React.createElement(Triangle, { c: mid, r: paddedRadius, time: time }), /*#__PURE__*/
    React.createElement(SecCircle, { c: mid, r: paddedRadius, time: time }), /*#__PURE__*/
    React.createElement(TextTime, { time: time, x: mid, y: mid })));


};

ReactDOM.render( /*#__PURE__*/React.createElement(Clock, null), document.querySelector(".clock"));