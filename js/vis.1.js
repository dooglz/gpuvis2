/* global d3, INSTRUCTIONTYPE, Instuctions, InitVis, TaskChart, metrics */
/* exported InitVis*/

let catagoryColourScale20 = d3.scale.category20();
let catagoryColourScale10 = d3.scale.category10();

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

function InitVis() {
  if (tc) {
    tc.Clear();
  }
  if (cuVisSvg) {
    ClearCuvis();
  }
  tc = new TaskChart(d3.select("#visContainerDiv"), Instuctions, metrics.wfCount);
  tc.setFillfunc(showWfCu ? colourCUfunc : colourScalefunc);
  tc.Redraw();
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
