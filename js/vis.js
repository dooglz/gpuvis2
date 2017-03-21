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



function dataDec(d) {
  var ignore = ["children", "id", "name"];
  var s = [];
  for (var key in d) {
    if (ignore.includes(key)) continue;
    if (d.hasOwnProperty(key)) {
      s.push(key + " - " + d[key]);
    }
  }
  return s;
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


var w, h, x, y, svg, dcontainer, jcontainer, cell, currentZoom, rootNode;
var partition;
var format = d3.format(",d");

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
    .round(false);

  partition(rootNode);
  currentZoom = rootNode;
  cell = svg
    .selectAll(".node")
    .data(rootNode.descendants())
    .enter().append("g")
    .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
    .attr("transform", function(d) { return "translate(" + d.y0 + "," + d.x0 + ")"; })
    .attr("visibility", function(d) { return d.x1 - d.x0 < 5 ? "hidden" : "visible"; });

  cell.append("rect")
    .attr("id", function(d) { return "rect-" + d.id; })
    .attr("width", function(d) { return d.y1 - d.y0; })
    .attr("height", function(d) { return d.x1 - d.x0; })
    .style("fill", function(d) { return catagoryColourScale10(d.depth); });

  cell.append("clipPath")
    .attr("id", function(d) { return "clip-" + d.id; })
    .append("use")
    .attr("xlink:href", function(d) { return "#rect-" + d.id + ""; })

  cell.append("text")
    .attr("visibility", function(d) { return d.x1 - d.x0 > 10 ? "visible" : "hidden"; })
    .attr("transform", function(d) { return "translate(" + 4 + "," + 10 + ")"; })
    .text(function(d) { return d.data.name; })
    .attr("class", "NameText");

  var deets = cell.append("text")
    .attr("visibility", function(d) { return d.x1 - d.x0 > 30 ? "visible" : "hidden"; })
    .attr("transform", function(d) { return "translate(" + 14 + "," + 23 + ")"; })
    .attr("class", "DetailsText")
    .each(function(d) {
      var arr = dataDec(d.data);
      for (i = 0; i < arr.length; i++) {
        d3.select(this).append("tspan")
          .text(arr[i])
          .attr("dy", i ? "1.2em" : 0)
          .attr("x",  14)
          .attr("text-anchor", "left")
          .attr("class", "tspan" + i);
      }
    });

  cell.append("title")
    .text(function(d) { return d.data.name; });
  cell.on("click", Zoom);

  //d3.select(window).on("click", function() { Zoom(rootNode); })

  function transform(d) {
    return "translate(8," + d.dx * ky / 2 + ")";
  }

}

var rebaseTally = 0;
var rebasetarget;
function Rebase(d) {
  console.log("Rebasing on  ", d.data.name, d.children[0].y0, d);

  var depth = d.depth;
  var rebaser = function(d) { d.depth -= depth; };

  if (rebaseTally != 0) {
    console.log("undoing previous rebase on ", rebasetarget.data.name, rebasetarget);
    depth = -rebaseTally;
    rebasetarget.eachBefore(rebaser);
    rebaseTally = 0;
    rebasetarget = null;
  }

  depth = d.depth;
  rebasetarget = d;
  d.eachBefore(rebaser);

  rebaseTally = depth;

  partition(d);
  console.log("Rebased on  ", d.data.name, d.children[0].y0, d);
  currentZoom = d;
  // cell.data(d.descendants());

  var t = cell.transition()
    // .duration(1750)
    .attr("transform", function(d) {
      return "translate(" + d.y0 + "," + d.x0 + ")";
    })
    .attr("visibility", function(d) { return d.x1 - d.x0 > 5 && currentZoom.descendants().includes(d) ? "visible" : "hidden"; })
  // .style("opacity", function(d) { return (currentZoom.descendants().includes(d) ? 1.0 : 0.0); });


  t.select("rect").filter(function(d) { return (currentZoom.descendants().includes(d)); })
    .attr("width", function(d) { return d.y1 - d.y0; })
    .attr("height", function(d) { return d.x1 - d.x0; })

  t.select(".NameText")
    .attr("visibility", function(d) { return d.x1 - d.x0 > 10 && currentZoom.descendants().includes(d) ? "visible" : "hidden"; });
  t.select(".DetailsText")
    .attr("visibility", function(d) { return d.x1 - d.x0 > 30 && currentZoom.descendants().includes(d) ? "visible" : "hidden"; });


}

function Zoom(d) {
  if (!d.children) return;
  if (currentZoom == d) {
    ZoomUP();
    return;
  }
  if (!d.descendants().includes(currentZoom) && !currentZoom.descendants().includes(d)) {
    console.log("No Sideways zooming pls");
    return;
  }

  Rebase(d);
  return;

  //are we moving up or down?
  var up = currentZoom.ancestors().includes(d);

  if (!up && ((d.children[0].x1 - d.children[0].x0) < 5)) {
    //if we are moving down, check if we need to rebase the partitions
    if (d.children[0].x1 - d.children[0].x0 < 5) {
      console.log("TOO SMALL! ", d.children[0].x1 - d.children[0].x0);
      //REBASE
      //d.count();
      Rebase(d);
      return;
    }
  }
  //if(up)

  y.domain([d.x0, d.x1]);
  x.domain([d.y0, w]);
  currentZoom = d;



  console.log("Zooming on ", up, (d.y1 - d.y0), x(d.y1), y(d.x1 - d.x0), d);

  var t = cell.transition()
    .duration(1750)
    .attr("transform", function(d) {
      return "translate(" + x(d.y0) + "," + y(d.x0) + ")";
    })
    .attr("visibility", function(d) { return d.x1 - d.x0 < 5 ? "hidden" : "visible"; })



  t.select("rect").filter(function(d) { return (currentZoom.descendants().includes(d)); })
    .attr("width", function(d) { return x(d.y1) - x(d.y0); })
    .attr("height", function(d) { return y(d.x1) - y(d.x0); });

  t.select(".NameText")
    .attr("visibility", function(d) { return y(d.x1) - y(d.x0) > 10 ? "visible" : "hidden"; });
  t.select(".DetailsText")
    .attr("visibility", function(d) { return y(d.x1) - y(d.x0) > 30 ? "visible" : "hidden"; });
  //d3.event.stopPropagation();
}


function ZoomUP() {
  if (currentZoom.parent === null) return;
  Zoom(currentZoom.parent);
}

function ResetZoom() {
  //currentZoom = rootNode;
  Zoom(rootNode);
  return;
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
    .attr("visibility", function(d) { return y(d.x1) - y(d.x0) > 10 ? "visible" : "hidden"; });
  t.select(".DetailsText")
    .attr("visibility", function(d) { return y(d.x1) - y(d.x0) > 30 ? "visible" : "hidden"; });
}
