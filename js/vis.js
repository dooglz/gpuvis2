/* global d3, INSTRUCTIONTYPE, Instuctions, InitVis, TaskChart, metrics */
/* exported InitVis*/

let catagoryColourScale20 = d3.scaleOrdinal(d3.schemeCategory20);
let catagoryColourScale10 = d3.scaleOrdinal(d3.schemeCategory10);
var hotcolorScale = d3.scaleLinear().domain([0, 1]).range(["white", "red"]);

/** Colour by d.type.value*/
function colourScalefunc(d) {
  if (Object.keys(INSTRUCTIONTYPE).length > 10) {
    return catagoryColourScale20(d.type.value);
  }
  return catagoryColourScale10(d.type.value);
}

function dataDec(d) {
  var ignore = ["children", "id", "name", "type"];
  var s = [];
  for (var key in d) {
    if (ignore.includes(key)) continue;
    if (d.type == "SIMD LANE" && key == "occu") continue;
    if (d.hasOwnProperty(key)) {
      s.push(key + ": " + d[key]);
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
    CU.wgs = [];
    CU.children = [];
    for (var j = 0; j < device.SIMD; j++) {
      var SM = {};
      SM.type = "SIMD, VECTOR";
      SM.id = j;
      SM.name = SM.type + " " + i + "," + j;
      SM.LDS = device.LDS + "KB";
      SM.wgs = [];
      SM.children = [];
      for (var g = 0; g < device.SIMD_LANES; g++) {
        var lane = {};
        lane.type = "SIMD LANE";
        lane.id = g;
        lane.name = "Lane " + g;
        lane.pc = "";
        lane.wave = -1;
        lane.wg = -1;
        lane.occu = 0.0;
        lane.asm = "";
        SM.children.push(lane);
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

function Update() {
  var t = cell.select(".DetailsText");
  t.selectAll("*").remove();
  t.each(function(d) {
    var arr = dataDec(d.data);
    for (i = 0; i < arr.length; i++) {
      d3.select(this).append("tspan")
        .text(arr[i])
        .attr("dy", i ? "1.2em" : 0)
        .attr("x", 14)
        .attr("text-anchor", "left")
        .attr("class", "tspan" + i);
    }
  });
  codeOccu();
}

function codeOccu() {
  cell.select("rect").style("fill", function(d) { return hotcolorScale(d.data.occu); });
}


function codeAlloc() {
  var id = 0;
  cell.select("rect").style("fill", function(d) {
    if (d.data.wgs !== undefined && d.data.wgs.length > 1) {
      var gid = "gradient" + (id++);
      var gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", gid)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");
      var total = d.data.wgs.length;
      var step = 1.0 / total;
      for (var index = 0; index < total; index++) {
        var col = catagoryColourScale20(d.data.wgs[index]);
        gradient.append("stop")
          .attr("offset", (index * step * 100.0) + "%")
          .attr("stop-color", col)
          .attr("stop-opacity", 1);
      }

      return "url(#" + gid + ")";

    } else if (d.data.wgs !== undefined && d.data.wgs.length == 1) {
      return catagoryColourScale20(d.data.wgs[0]);
    } else if (d.data.wg !== undefined && d.data.wg != -1) {
      return catagoryColourScale20(d.data.wg);
    } else {
      return "white";
    }
  });
}


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
    .attr("visibility", function(d) { return d.x1 - d.x0 < 2 ? "hidden" : "visible"; });

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
          .attr("x", 14)
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
  var decs = currentZoom.descendants();

  // cell.data(d.descendants());

  var t = cell
    // .duration(1750)
    .attr("transform", function(d) {
      return "translate(" + d.y0 + "," + d.x0 + ")";
    })
    .attr("visibility", function(d) { return d.x1 - d.x0 > 2 && decs.includes(d) ? "visible" : "hidden"; })
  // .style("opacity", function(d) { return (currentZoom.descendants().includes(d) ? 1.0 : 0.0); });


  t.select("rect").filter(function(d) { return (decs.includes(d)); })
    .attr("width", function(d) { return d.y1 - d.y0; })
    .attr("height", function(d) { return d.x1 - d.x0; })

  t.select(".NameText")
    .attr("visibility", function(d) { return d.x1 - d.x0 > 10 && decs.includes(d) ? "visible" : "hidden"; });
  t.select(".DetailsText")
    .attr("visibility", function(d) { return d.x1 - d.x0 > 30 && decs.includes(d) ? "visible" : "hidden"; });


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
  var t = cell
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


function getiCU(id) {
  for (var i = 0; i < rootNode.children.length; i++) {
    if (rootNode.children[i].data.id === id) return rootNode.children[i];
  }
}

function getiSIMD(cui, id) {
  var cu = getiCU(cui);
  for (var i = 0; i < cu.children.length; i++) {
    if (cu.children[i].data.id === id) return cu.children[i];
  }
}
function getSIMD(cu, id) {
  for (var i = 0; i < cu.children.length; i++) {
    if (cu.children[i].data.id === id) return cu.children[i];
  }
}

function getiLane(cui, smi, id) {
  var sm = getiSIMD(cui, smi);
  if (id == -1) {
    var ret = [];
    for (var i = 0; i < sm.children.length; i++) {
      ret.push(sm.children[i]);
    }
    return ret;
  }
  for (var i = 0; i < sm.children.length; i++) {
    if (sm.children[i].data.id === id) return sm.children[i];
  }
}

function getLane(sm, id) {
  if (id == -1) {
    var ret = [];
    for (var i = 0; i < sm.children.length; i++) {
      ret.push(sm.children[i]);
    }
    return ret;
  }
  for (var i = 0; i < sm.children.length; i++) {
    if (sm.children[i].data.id === id) return sm.children[i];
  }
}

function MergeTraceData(trace) {
  for (var wgi = 0; wgi < trace.workgroups.length; wgi++) {
    var wg = trace.workgroups[wgi];
    for (var wvi = 0; wvi < wg.waves.length; wvi++) {
      var wv = wg.waves[wvi];
      var CU = getiCU(wv.cu_id);
      if (!CU.data.wgs.includes(wgi)) CU.data.wgs.push(wgi);
      var simd = getSIMD(CU, wv.simd_id);
      //  simd.data.wg = wgi;
      if (!simd.data.wgs.includes(wgi)) simd.data.wgs.push(wgi);
      var lanes = getLane(simd, -1);
      var lni = wv.se_id;
      //for (var lni = 0; lni < lanes.length; lni++) {
      lanes[lni].data.pc = wv.program_counter;
      lanes[lni].data.wave = wv.wave_id;
      if (lanes[lni].data.wg != -1) {
        console.log("CLASH", wv.cu_id, wv.simd_id, lni, lanes[lni].data.wg, wgi);
      }
      lanes[lni].data.wg = wgi;
      lanes[lni].data.occu = 1.0;
      lanes[lni].data.asm = wv.asm;
      // }
    }
  }
  console.log("Merged");
  //Calculate occupancy
  var gputalley = 0;
  for (var i = 0; i < rootNode.children.length; i++) {
    var cu = rootNode.children[i];
    var cutally = 0;
    for (var j = 0; j < cu.children.length; j++) {
      var simd = cu.children[j];
      var tally = 0;
      if (simd.children == undefined) continue;
      for (var k = 0; k < simd.children.length; k++) {
        var lane = simd.children[k];
        if (lane.data.occu == 1.0) {
          tally++;
        }
      }
      simd.data.occu = tally / simd.children.length;
      cutally += simd.data.occu;
    }
    cu.data.occu = cutally / (cu.children.length - 1); //plus 1 for scaler unit hax
    gputalley += cu.data.occu;
  }
  rootNode.data.occu = gputalley / rootNode.children.length;
  console.log("done");
  Update();
}

