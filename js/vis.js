/* global d3, INSTRUCTIONTYPE, Instuctions, InitVis, TaskChart, metrics */
/* exported InitVis*/

let catagoryColourScale20 = d3.scaleOrdinal(d3.schemeCategory20);
let catagoryColourScale10 = d3.scaleOrdinal(d3.schemeCategory10);

/** Colour by d.type.value*/
function colourScalefunc(d) {
  if (Object.keys(INSTRUCTIONTYPE).length > 10) {
    return catagoryColourScale20(d.type.value);
  }
  return catagoryColourScale10(d.type.value);
}

/** Colour by d.cu*/
function colourCUfunc(d) {
  return catagoryColourScale10(d.cu);
}

let showWfCu = false;
let tc;
let cuVisSvg = null;

function ClearCuvis() {
  if (cuVisSvg) {
    cuVisSvg.remove();
  }
}

function deviceJsontoD3data(device) {
  var d3d = {};
  d3d.name = device.name;
  d3d.vram = device.VRAM + "MB";
  d3d.cache = 0;
  d3d.children = [];
  d3d.id = 0;
  for (var i = 0; i < device.CU; i++) {
    var CU = {};
    CU.type = "COMPUTE UNIT";
    CU.id = i;
    CU.name = CU.type + " " + i;
    CU.GDS = device.GDS + "KB";
    CU.children = [];
    for (var j = 0; j < device.SIMD; j++) {
      var SM = {};
      SM.type = "SIMD, VECTOR";
      SM.id = j;
      SM.name = SM.type + " " + i + "," + j;
      SM.LDS = device.LDS + "KB";
      SM.children = [];
      for (var g = 0; g < device.SIMD_LANES; g++) {
        SM.children.push({ type: "SIMD LANE", id: g, name: "Lane " + g });
      }
      CU.children.push(SM);
    }
    for (var k = 0; k < device.SCALER; k++) {
      var SC = {}
      SC.type = "SIMD, SCALER";
      SC.name = SC.type + " " + i + "," + k;
      SC.id = k;
      CU.children.push(SC);
    }
    d3d.children.push(CU);
  }
  return d3d;
}

/*
var partition = d3.layout.partition()
  .value(function(d) { return d.size; });
*/
var w, h, x, y, svg, dcontainer, jcontainer, cell;

var format = d3.format(",d");
//var color = d3.scaleOrdinal(d3.schemeCategory10);

function InitVis(DEVICE) {
  root = d3.hierarchy(deviceJsontoD3data(DEVICE));
  dcontainer = d3.select("#visContainerDiv");
  jcontainer = $("#visContainerDiv");
  w = jcontainer.width();
  h = jcontainer.height();
  x = d3.scaleLinear().range([0, w]);
  y = d3.scaleLinear().range([0, h]);

  svg = dcontainer.append("svg:svg");
  svg.attr("width", w).attr("height", h);
  root.count();

  var partition = d3.partition()
    .size([h, w])
    .padding(1)
    .round(true);

  partition(root);

  cell = svg
    .selectAll(".node")
    .data(root.descendants())
    .enter().append("g")
    .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
    .attr("transform", function(d) { return "translate(" + d.y0 + "," + d.x0 + ")"; });

  cell.append("rect")
    .attr("id", function(d) { return "rect-" + d.id; })
    .attr("width", function(d) { return d.y1 - d.y0; })
    .attr("height", function(d) { return d.x1 - d.x0; })
    //.filter(function(d) { return !d.children; })
    // .style("fill", function(d) { while (d.depth > 1) d = d.parent; return catagoryColourScale10(d.id); });
    .style("fill", function(d) { return catagoryColourScale10(d.depth); });

  cell.append("clipPath")
    .attr("id", function(d) { return "clip-" + d.id; })
    .append("use")
    .attr("xlink:href", function(d) { return "#rect-" + d.id + ""; });

  cell.append("text")
    // .attr("clip-path", function(d) { return "url(#clip-" + d.id + ")"; })
    //.attr("x", 4)
    //.attr("y", 13)
    .attr("transform", function(d) { return "translate(" + 4 + "," + 13 + ")"; })
    .text(function(d) { return d.data.name; });

  cell.append("title")
    .text(function(d) { return d.data.name; });
  cell.on("click", click);

  //d3.select(window).on("click", function() { click(root); })

  function click(d) {
    var elem = d;
    if (!d.children) return;

    y.domain([d.x0, d.x1]);
    x.domain([d.y0, w]);
    // var widthscale = d3.scaleLinear().range([d.y1, w]);

    console.log("Zooming on ", (d.y1 - d.y0), x(d.y1), y(d.x1 - d.x0), d);

    var t = cell.transition()
      .duration(1750)
      .attr("transform", function(d) {
        return "translate(" + x(d.y0) + "," + y(d.x0) + ")";
      })
      // .attr("visibility", function(d) { return (elem.descendants().includes(d) ? "visible" : "hidden"); });
      .style("opacity", function(d) { return (elem.descendants().includes(d) ? 1.0 : 0.0); });
    ;

    t.select("rect").filter(function(d) { return (elem.descendants().includes(d)); })
      //  .attr("width", d.dy * kx)
      .attr("width", function(d) { return x(d.y1); })
      .attr("height", function(d) { return y(d.x1 - d.x0); });
    /*
        t.select("text")
          .attr("transform", transform)
          .style("opacity", function(d) { return d.dx * ky > 12 ? 1 : 0; });
    */
    d3.event.stopPropagation();
  }
  function transform(d) {
    return "translate(8," + d.dx * ky / 2 + ")";
  }

}

function ResetZoom() {
  y.domain([0, h]);
  x.domain([0, w]);
  var t = cell.transition()
    .duration(750)
    .attr("transform", function(d) {
      return "translate(" + x(d.y0) + "," + y(d.x0) + ")";
    })
    .style("opacity", 1.0)
    .attr("visibility", "visible");

  t.select("rect")
    .attr("width", function(d) { return d.y1 - d.y0; })
    .attr("height", function(d) { return y(d.x1 - d.x0); });
}

var acitivityMode = true;

function ShowCuvis() {
  tc.Clear();
  ClearCuvis();
  let Ymax = metrics.globalMaxInstActivity;
  let Ymin = 0;
  let Xmax = metrics.cu[0].instActivity.length;
  let Xmin = 0;
  let padding = [0, 48, 30, 5];
  let container = d3.select("#visContainerDiv");
  let width = parseInt(container.style("width"), 10);
  let height = parseInt(container.style("height"), 10);
  let numberOfLanes = metrics.cuCount;
  let xScale = d3.scale.linear().domain([Xmin, Xmax]).range([0, width - (padding[2] + padding[3])]).clamp(true);
  let yScale = d3.scale.ordinal().domain(d3.range(numberOfLanes)).rangeRoundBands([0, height - (padding[0] + padding[1])]);
  let yScaleLocal = d3.scale.ordinal().domain(d3.range(Ymax + 1)).rangeRoundBands([0, yScale.rangeBand()]);
  let xAxis = d3.svg.axis().scale(xScale).orient("bottom").tickSubdivide(true).tickSize(8).tickPadding(8);
  let yAxis = d3.svg.axis().scale(yScale).orient("left").tickSize(0);

  cuVisSvg = container.append('svg').attr('width', width).attr('height', height);

  let xax = cuVisSvg.append("g");
  xax.attr("class", "x axis")
    .attr("transform", "translate(" + padding[2] + ", " + (height - padding[1]) + ")")
    .transition().call(xAxis);

  xax.append("text")
    .attr("transform", "translate(" + xScale.range()[1] / 2 + ",40)")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .text("(simulated) GPU Ticks");

  let yax = cuVisSvg.append("g");
  yax.attr("class", "y axis")
    .attr("transform", "translate(" + padding[2] + ", 0)")
    .transition().call(yAxis);
  yax.append("text")
    .attr("transform", "translate(-18," + yScale.rangeExtent()[1] / 2 + ") rotate(-90)")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .text("Compute Unit ID");


  for (let i = 0; i < numberOfLanes; i++) {
    let qqr = i;
    let data = metrics.cu[qqr];
    let area = d3.svg.area()
      .x(function(d, index) {
        return xScale(index);
      })
      .y0(yScale(qqr) + yScale.rangeBand())

      .y1(function(d, index) {
        let a = (yScale(qqr) + yScale.rangeBand());
        let b = yScaleLocal((acitivityMode ? d : d.reduce(function(a, b) {
          return a + b;
        })));
        return (a - b);
      });
    let col = catagoryColourScale10(qqr);
    cuVisSvg.append("g")
      .attr("transform", "translate(" + padding[2] + ",0)").append("path")
      //.datum(acitivityMode ? data.instActivity : data.wfActivity)
      .datum(data.instActivity)
      //.attr("class", "area")
      .attr("d", area)
      .attr("fill", col);
  }
}
