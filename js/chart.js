// Helper function to truncate text
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Helper function to build a breadcrumb-like path
function buildPath(node) {
  let path = [];
  let currentNode = node;
  
  while (currentNode) {
    path.unshift(currentNode.data.name);
    currentNode = currentNode.parent;
  }
  
  return path.join(" -> ");
}

// Set dimensions and margins for the chart
const width_chart = 1300, height_chart = 400;
const margin = { top: 30, right: 30, bottom: 0, left: 200 };
const duration = 750;

// Create an SVG container
const svg_chart = d3.select("#chart")
  .append("svg")
  .attr("width", width_chart)
  .attr("height", height_chart)
  .attr("viewBox", `0 0 ${width_chart} ${height_chart}`)
  .style("max-width", "100%")
  .style("height", "auto")
  .attr("cursor", "pointer")
  .style("border", "1px solid #ccc");

// Add a single, persistent title element
const titleElement = svg_chart.append("text")
  .attr("class", "chart-title-main")
  .attr("x", width_chart / 2)
  .attr("y", margin.top - 10)
  .attr("text-anchor", "middle")
  .style("font-size", "16px")
  .style("font-weight", "bold")
  .text("Distribution of Hospitals by Type and Ownership (2010 vs 2020)");

// Add subtitle for current level
const subtitleElement = svg_chart.append("text")
  .attr("class", "chart-subtitle")
  .attr("x", width_chart / 2)
  .attr("y", margin.top + 10)
  .attr("text-anchor", "middle")
  .style("font-size", "16px")
  .style("fill", "#666");

// Create a tooltip element
const tooltip_chart = d3.select("body").append("div")
  .attr("id", "tooltip_chart")
  .style("position", "absolute")
  .style("display", "none")
  .style("background", "#f8f8f8")
  .style("border", "1px solid #ccc")
  .style("padding", "5px")
  .style("font-size", "12px")
  .style("border-radius", "3px")
  .style("pointer-events", "none");

// Load and process data
d3.json("json/hierarchical_data.json").then(data => {
  console.log("Loaded Data:", data);

  const root = d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  // X-scale setup
  const x = d3.scaleLinear().range([margin.left, width_chart - margin.right]);
  x.domain([0, root.value]);

  // Add background for click handling
  svg_chart.append("rect")
    .attr("class", "background")
    .attr("fill", "transparent")
    .attr("width", width_chart)
    .attr("height", height_chart)
    .on("click", (event) => {
      event.stopPropagation();
      up();
    });

  const colorScale = d3.scaleOrdinal()
    .domain(['parent', 'leaf'])
    .range(['#94A187', '#E07A5F']);

  function getColor(d) {
    return d.children ? colorScale('parent') : colorScale('leaf');
  }

  const barsContainer = svg_chart.append("g")
    .attr("class", "bars-container");

  function drawBars(d) {
    // Store current node
    svg_chart.property("currentNode", d);

    // Update subtitle with the current path
    subtitleElement.text(buildPath(d));

    // Update x-scale
    x.domain([0, d.value]);

    // Bind data to bars with a unique key
    const bars = barsContainer.selectAll("g.bar")
      .data(d.children || [], d => d.data.name);

    // Remove exiting bars
    bars.exit()
      .transition()
      .duration(duration / 2)
      .style("opacity", 0)
      .remove();

    // Clear existing bars to avoid duplicates
    barsContainer.selectAll("g.bar").remove();

    // Enter new bars
    const enterBars = bars.enter()
      .append("g")
      .attr("class", "bar")
      .attr("transform", (d, i) => `translate(0, ${margin.top + 20 + i * 30})`)
      .style("opacity", 0);

    // Add labels
    enterBars.append("text")
      .attr("x", margin.left - 6)
      .attr("y", 13.5)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(d => truncateText(d.data.name, 20))
      .style("fill", "#000")
      .on("mouseover", function(event, d) {
        tooltip_chart.style("display", "inline-block")
          .html(d.data.name);
      })
      .on("mousemove", function(event) {
        tooltip_chart.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function() {
        tooltip_chart.style("display", "none");
      });

    // Add rectangles
    enterBars.append("rect")
      .attr("x", x(0))
      .attr("width", 0)
      .attr("height", 24)
      .style("fill", getColor)
      .on("mouseover", function(event, d) {
        tooltip_chart.style("display", "inline-block")
          .html(`Value: ${d.value}`);
      })
      .on("mousemove", function(event) {
        tooltip_chart.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function() {
        tooltip_chart.style("display", "none");
      });

    // Update + Enter transitions
    const barsUpdate = enterBars.merge(bars);

    barsUpdate
      .transition()
      .delay((d, i) => i * 50)
      .duration(duration)
      .style("opacity", 1)
      .attr("transform", (d, i) => `translate(0, ${margin.top + 20 + i * 30})`);

    barsUpdate.select("rect")
      .transition()
      .delay((d, i) => i * 50)
      .duration(duration)
      .attr("width", d => Math.max(0, x(d.value) - x(0)));

    // Add interactivity
    barsUpdate.each(function(d) {
      const bar = d3.select(this);
      
      bar.on("click", null)
         .on("mouseenter", null)
         .on("mouseleave", null);

      if (d.children) {
        bar
          .style("cursor", "pointer")
          .on("click", function(event) {
            event.stopPropagation();
            drawBars(d);
          })
          .on("mouseenter", function() {
            d3.select(this)
              .transition()
              .duration(200)
              .style("opacity", 0.8);
          })
          .on("mouseleave", function() {
            d3.select(this)
              .transition()
              .duration(200)
              .style("opacity", 1);
          });
      }
    });
  }

  function up() {
    const current = svg_chart.property("currentNode");
    
    if (current && current.parent) {
      drawBars(current.parent);
    }
  }

  // Initial render
  drawBars(root);
}).catch(error => {
  console.error("Error loading or parsing data:", error);
  console.log("Stack trace:", error.stack);
});