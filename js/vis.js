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
var w, h, x, y, svg, dcontainer, jcontainer, cell, currentZoom, rootNode;
var partition;
var format = d3.format(",d");
//var color = d3.scaleOrdinal(d3.schemeCategory10);

function InitVis(DEVICE) {
  rootNode = d3.hierarchy(deviceJsontoD3data(DEVICE));
  dcontainer = d3.select("#visContainerDiv");
  jcontainer = $("#visContainerDiv");
  w = jcontainer.width();
  h = jcontainer.height();
  x = d3.scaleLinear().range([0, w]);
  y = d3.scaleLinear().range([0, h]);

  svg = dcontainer.append("svg:svg");
  svg.attr("width", w).attr("height", h);
  rootNode.count();

  partition = d3.partition()
    .size([h, w])
    .padding(1)
    .round(true);

  partition(rootNode);
  currentZoom = rootNode;
  cell = svg
    .selectAll(".node")
    .data(rootNode.descendants())
    .enter().append("g")
    .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
    .attr("transform", function(d) { return "translate(" + d.y0 + "," + d.x0 + ")"; });

  cell.append("rect")
    .attr("id", function(d) { return "rect-" + d.id; })
    .attr("width", function(d) { return d.y1 - d.y0; })
    .attr("height", function(d) { return d.x1 - d.x0; })
    .style("fill", function(d) { return catagoryColourScale10(d.depth); });

  cell.append("clipPath")
    .attr("id", function(d) { return "clip-" + d.id; })
    .append("use")
    .attr("xlink:href", function(d) { return "#rect-" + d.id + ""; });

  cell.append("text")
    .style("opacity", function(d) { return d.x1 - d.x0 > 10 ? 1 : 0; })
    .attr("transform", function(d) { return "translate(" + 4 + "," + 10 + ")"; })
    .text(function(d) { return d.data.name; })
    .attr("class","NameText");

  cell.append("text")
    .style("opacity", function(d) { return d.x1 - d.x0 > 30 ? 1 : 0; })
    .attr("transform", function(d) { return "translate(" + 14 + "," + 23 + ")"; })
    .text(function(d) { return d.data.name; })
    .attr("class","DetailsText");

  cell.append("title")
    .text(function(d) { return d.data.name; });
  cell.on("click", Zoom);

  //d3.select(window).on("click", function() { Zoom(rootNode); })

  function transform(d) {
    return "translate(8," + d.dx * ky / 2 + ")";
  }

}

function Zoom(d) {
  if (!d.children) return;
  if(currentZoom == d){
    ZoomUP();
    return;
  }
  currentZoom = d;

  y.domain([d.x0, d.x1]);
  x.domain([d.y0, w]);

  console.log("Zooming on ", (d.y1 - d.y0), x(d.y1), y(d.x1 - d.x0), d);

  var t = cell.transition()
    .duration(1750)
    .attr("transform", function(d) {
      return "translate(" + x(d.y0) + "," + y(d.x0) + ")";
    })
    .style("opacity", function(d) { return (currentZoom.descendants().includes(d) ? 1.0 : 0.0); });


  t.select("rect").filter(function(d) { return (currentZoom.descendants().includes(d)); })
    .attr("width", function(d) { return x(d.y1) - x(d.y0); })
    .attr("height", function(d) { return y(d.x1) - y(d.x0); });

  t.select(".NameText")
    .style("opacity", function(d) { return y(d.x1) - y(d.x0) > 10 ? 1 : 0; });
  t.select(".DetailsText")
    .style("opacity", function(d) { return y(d.x1) - y(d.x0) > 30 ? 1 : 0; });
  //d3.event.stopPropagation();
}


function ZoomUP() {
  if (currentZoom.parent === null) return;
  Zoom(currentZoom.parent);
}

function ResetZoom() {
  currentZoom = rootNode;
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
    .attr("width", function(d) { return x(d.y1) - x(d.y0); })
    .attr("height", function(d) { return y(d.x1 - d.x0); });

  t.select(".NameText")
    .style("opacity", function(d) { return y(d.x1) - y(d.x0) > 10 ? 1 : 0; });
  t.select(".DetailsText")
    .style("opacity", function(d) { return y(d.x1) - y(d.x0) > 30 ? 1 : 0; });
}
