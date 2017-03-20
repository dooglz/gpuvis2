class Task {
    constructor(start = 0, end = 0, lane = 0, name = "", type = -1) {
        if (name == "") { name = Math.random().toString(36).substring(0, 4); }
        if (type == -1) { type = Math.random() % 20; }
        this.start = start;
        this.end = end;
        this.name = name;
        this.lane = lane;
        this.type = type;
    }
};
colors = d3.scale.category20();
class TaskChart {
    constructor(container, data, numberOfLanes) {
        this.container = container
        this.data = data;
        this.ndata = d3.nest()
            .key(function(d) { return d.name; })
            .entries(this.data);
        this.numberOfLanes = numberOfLanes;
        this.legendHeight = 20;
        this.padding = [0 + this.legendHeight, 48, 30, 5];
        this.taskPadding = [1, 1];
        this.defaultfillFunc = function(d, i) { return d3.rgb(64 + Math.random() * 128, 64 + Math.random() * 128, 64 + Math.random() * 128); }
        this.fillfunc = this.defaultfillFunc;
    }
    Clear() {
        if(this.svg){
            this.svg.remove();
        }
    }
    Redraw() {
        this.width = parseInt(this.container.style("width"));
        this.height = parseInt(this.container.style("height"));
        this.InitDomains();
        console.log(this.container, this.width, this.height);
         this.Clear();
        this.svg = this.container.append('svg').attr('width', this.width).attr('height', this.height);

        //Create Axises
        let tickFormat = "%H:%M";
        this.xAxis = d3.svg.axis().scale(this.xScale).orient("bottom").tickSubdivide(true).tickSize(8).tickPadding(8);
        this.yAxis = d3.svg.axis().scale(this.yScale).orient("left").tickSize(0);
        let xax = this.svg.append("g");
        xax.attr("class", "x axis")
            .attr("height", this.padding[1])
            .attr("transform", "translate(" + this.padding[2] + ", " + (this.height - this.padding[1]) + ")")
            .transition().call(this.xAxis);
        xax.append("text")
            .attr("transform", "translate(" + this.xScale.range()[1] / 2 + ",40)")
            .attr("font-weight", "bold")
            .attr("text-anchor", "middle")
            .text("(simulated) GPU Ticks");

        let yax = this.svg.append("g");
        yax.attr("class", "y axis")
            .attr("transform", "translate(" + this.padding[2] + "," + this.padding[0] + ")")
            .transition().call(this.yAxis);
        yax.append("text")
            .attr("transform", "translate(-18," + this.yScale.rangeExtent()[1] / 2 + ") rotate(-90)")
            .attr("font-weight", "bold")
            .attr("text-anchor", "middle")
            .text("Wavefront ID");

        var rectTransform = function(d) {
            return "translate(" + this.xScale(d.start) + this.padding[2] + "," + (this.yScale(d.lane) + this.taskPadding[0]) + ")";
        };

        this.svg.append("g")
            .attr("transform", "translate(" + this.padding[2] + ", " + this.padding[0] + ")")
            .selectAll('.task').data(this.data).enter()
            .append("rect")
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("y", 0)
            .attr("transform", $.proxy(rectTransform, this))
            .attr("height", $.proxy(function(d) { return this.yScale.rangeBand() - (this.taskPadding[0] + this.taskPadding[1]); }, this))
            .attr("width", $.proxy(function(d) { return (this.xScale(d.end) - this.xScale(d.start)); }, this))
            .attr("fill", this.fillfunc)
            .text(function(d) { return d; });

        //egend
        //legend
        let ll = this.width;
        let lh = this.legendHeight;
        let lli = ll / INSTRUCTIONTYPEARR.length;
        var legend = this.svg.insert('g', ":first-child")
            .attr("class", "legend")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", this.legendHeight)
            .attr("width", ll)

        legend.selectAll('g').data(INSTRUCTIONTYPEARR)
            .enter()
            .append('g')
            .attr("width", lli)
            .attr("height", lh)
            .attr("transform", ((d, i) => { return "translate(" + (this.padding[2] + 20 + (i * lli)) + ", " + lh + ")"; }))
            .each(function(d, i) {
                var g = d3.select(this);
                g.append("rect")
                    .attr("y", -(3 * lh) / 4)
                    .attr("width", lh / 2)
                    .attr("height", lh / 2)
                    .style("fill", function(d) { return catagoryColourScale10(d.value) });

                g.append("text")
                    .attr("x", (lh / 2) + 2)
                    .attr("y", -lh / 4)
                    .style("fill", function(d) { return catagoryColourScale10(d.value) })
                    .text(function(d) { return d.name });
            });
    }

    InitDomains() {
        this.min = this.data.reduce(
            (previousValue, currentValue) =>
                (previousValue < currentValue.start ? previousValue : currentValue.start)
            , this.data[0].start);
        this.max = this.data.reduce(
            (previousValue, currentValue) =>
                (previousValue > currentValue.end ? previousValue : currentValue.end)
            , this.data[0].end);
        this.xScale = d3.scale.linear().domain([this.min, this.max]).range([0, this.width - (this.padding[2] + this.padding[3])]).clamp(true);
        this.yScale = d3.scale.ordinal().domain(d3.range(this.numberOfLanes)).rangeRoundBands([0, this.height - (this.padding[0] + this.padding[1])]);
    }
    setFillfunc(f) {
        this.fillfunc = f;
    }
}