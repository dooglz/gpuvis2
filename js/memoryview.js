/* global tc cuVisSvg ClearCuvis d3 totalChartSpaceHeight metrics*/
let memVisSvg = null;
let minH;

let labels = [
  "Total Load Ops",
  "Total Store Ops",
  "Global Loads",
  "Global Stores",
  "LDS Loads",
  "LDS Stores",
  "SGPR loads",
  "SGPR stores",
  "VGPR loads",
  "VGPR stores"
];
let filter = [true, true, true, true, false, false, false, false, false, false];

function CloseMemvis() {
  if (tc) {
    tc.Clear();
  }
  if (cuVisSvg) {
    ClearCuvis();
  }
  if (memVisSvg) {
    memVisSvg.remove();
  }

  $("#visContainerDiv2").remove();
  $("#membtns").remove();
  let div1 = d3.select("#visContainerDiv");
  div1.style('height', totalChartSpaceHeight + 'px');
  if (tc) {
    tc.Redraw();
  }
}

function handleMemCheck(cb) {
  if (cb.checked) {
    ShowMemVis();
  } else {
    CloseMemvis();
  }
}

var dragResize = d3.behavior.drag()
  .on('drag', function() {
    let div1 = d3.select("#visContainerDiv");
    let div2 = d3.select("#visContainerDiv2");

    // Determine resizer position relative to resizable (parent)
    let y = d3.mouse(document.body)[1];
    // Avoid negative or really small widths
    y = Math.min(Math.max(200, y), totalChartSpaceHeight - minH);
    div1.style('height', y + 'px');
    div2.style('height', (totalChartSpaceHeight - y) + 'px');
  })
  .on('dragstart', function() {
    tc.Clear();
    ClearMemvis();
  })
  .on('dragend', function() {
    tc.Redraw();
    MemVisRedraw();
  });

function ClearMemvis() {
  if (memVisSvg) {
    memVisSvg.remove();
  }
}

function ShowMemVis() {
  CloseMemvis();
  // make the current vis smaller
  if (tc) {
    tc.Clear();
  }
  if (cuVisSvg) {
    ClearCuvis();
  }

  $("#visContainerDiv").css("height", totalChartSpaceHeight * 0.8);
  $("#outercontainer").append('<div class="visContainer2" id="visContainerDiv2"><div class="resizer"></div></div>');
  $("#visContainerDiv2").css("height", totalChartSpaceHeight * 0.2)

  tc.Redraw();
  let container = d3.select("#visContainerDiv2");
  var resizer = container.select('.resizer');
  minH = parseInt(container.style("height"), 10);
  resizer.call(dragResize);

  let btndiv = $("<div>", { id: "membtns", class: 'controlContainer' });
  for (let label = 0; label < labels.length; ++label) {
    let btn = $("<input>", { type: "checkbox", id: labels[label], onchange: 2 });
    btn.prop('checked', filter[label]);
    btn.change(function(t) {
      filter[label] = $(this).is(':checked');
      MemVisRedraw();
    });
    btndiv.append("  "+labels[label]);
    btndiv.append(btn);
  }
  $("#controlContainerDiv").append(btndiv);
  MemVisRedraw();
}

function MemVisRedraw() {
  ClearMemvis();
  let container = d3.select("#visContainerDiv2");
  let maxes = [
    metrics.maxMemoryLoadOps,
    metrics.maxMemoryStoreOps,
    metrics.mem_maxsimul_globalLoad,
    metrics.mem_maxsimul_globalStore,
    metrics.mem_maxsimul_ldsLoad,
    metrics.mem_maxsimul_ldsStore,
    metrics.mem_maxsimul_sgprLoad,
    metrics.mem_maxsimul_sgprStore,
    metrics.mem_maxsimul_vgprLoad,
    metrics.mem_maxsimul_vgprStore
  ];
  let datums = [
    metrics.memoryLoad,
    metrics.memoryStore,
    metrics.globalLoad,
    metrics.globalStore,
    metrics.ldsLoad,
    metrics.ldsStore,
    metrics.sgprLoad,
    metrics.sgprStore,
    metrics.vgprLoad,
    metrics.vgprStore
  ];


  let amount = filter.reduce(function(p, c) {
    return c ? ++p : p;
  }, 0);
  let Ymax = 0;
  for (let i = 0; i < maxes.length; ++i) {
    if (filter[i]) {
      Ymax = Math.max(Ymax, maxes[i]);
    }
  }

  let Ymin = 0;
  let Xmax = metrics.cu[0].instActivity.length;
  let Xmin = 0;
  let padding = [0, 2, 20, 10];
  let width = parseInt(container.style("width"), 10);
  let height = parseInt(container.style("height"), 10);
  let xScale = d3.scale.linear().domain([Xmin, Xmax]).range([0, width - (padding[2] + padding[3])]).clamp(true);
  let yScale = d3.scale.linear().domain([Ymin, Ymax]).range([0, height / amount - (padding[0] + padding[1])]);

  memVisSvg = container.append('svg').attr('width', width).attr('height', height);

  let data = metrics.memory;
  let area = d3.svg.area()
    .x(function(d, index) {
      return xScale(index);
    })
    .y1(yScale(Ymax))
    .y0(function(d) {
      return yScale(Ymax) - yScale(d);
    });

  let j = 0;
  for (let i = 0; i < maxes.length; ++i) {
    console.log(filter[i]);
    if (filter[i]) {
      let bar = memVisSvg.append("g");
      bar.attr("height", height / amount)
        .attr("transform", "translate(" + padding[2] + "," + j * (height / amount) + ")").append("path")
        .datum(datums[i])
        .attr("d", area)
        .attr("fill", catagoryColourScale10(j));
      bar.append("text")
        .attr("transform", "translate(0,20)")
        .attr("font-weight", "bold")
        .attr("text-anchor", "left")
        .text(labels[i]);
      ++j;
    }
  }
}
