// Define dimensions for the chart.
const width_mri = 928;
const height_mri = 1010;

// This custom tiling function adapts the built-in binary tiling function for aspect ratio adjustment.
function tile(node, x0, y0, x1, y1) {
  d3.treemapBinary(node, 0, 0, width_mri, height_mri);
  for (const child of node.children) {
    child.x0 = x0 + child.x0 / width_mri * (x1 - x0);
    child.x1 = x0 + child.x1 / width_mri * (x1 - x0);
    child.y0 = y0 + child.y0 / height_mri * (y1 - y0);
    child.y1 = y0 + child.y1 / height_mri * (y1 - y0);
  }
}

// Function to render the hierarchical chart
function renderChart(data) {
  // Compute the layout.
  const hierarchy = d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  const root = d3.treemap().tile(tile)(hierarchy);

  // Create the scales.
  const x = d3.scaleLinear().rangeRound([0, width_mri]);
  const y = d3.scaleLinear().rangeRound([0, height_mri]);

  // Formatting utilities.
  const format = d3.format(",d");
  const name = d => d.ancestors().reverse().map(d => d.data.name).join("/");

  // Create the SVG container.
  const svg = d3.create("svg")
    .attr("viewBox", [0.5, -30.5, width_mri, height_mri + 30])
    .attr("width", width_mri)
    .attr("height", height_mri + 30)
    .attr("style", "max-width: 100%; height: auto;")
    .style("font", "10px sans-serif");

  let group = svg.append("g").call(render, root);

  function render(group, root) {
    const node = group.selectAll("g")
      .data(root.children.concat(root))
      .join("g");

    node.filter(d => d === root ? d.parent : d.children)
      .attr("cursor", "pointer")
      .on("click", (event, d) => d === root ? zoomout(root) : zoomin(d));

    node.append("title")
      .text(d => `${name(d)}\n${format(d.value)}`);

    node.append("rect")
      .attr("fill", d => d === root ? "#fff" : d.children ? "#ccc" : "#ddd")
      .attr("stroke", "#fff");

    node.append("clipPath")
      .append("use");

    node.append("text")
      .selectAll("tspan")
      .data(d => {
        const text = d === root ? name(d) : d.data.name;
        // Only split if the word contains camelCase pattern
        if (/[a-z][A-Z]/.test(text)) {
          return text.split(/(?=[A-Z][^A-Z])/g).concat(format(d.value));
        }
        // Otherwise return the whole word
        return [text].concat(format(d.value));
      })      
      .join("tspan")
      .attr("x", 3)
      .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
      .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
      .text(d => d);
    

    group.call(position, root);
  }

  function position(group, root) {
    group.selectAll("g")
      .attr("transform", d => d === root ? `translate(0,-30)` : `translate(${x(d.x0)},${y(d.y0)})`)
      .select("rect")
      .attr("width", d => d === root ? width_mri : x(d.x1) - x(d.x0))
      .attr("height", d => d === root ? 30 : y(d.y1) - y(d.y0));
  }

  function zoomin(d) {
    const group0 = group.attr("pointer-events", "none");
    const group1 = group = svg.append("g").call(render, d);

    x.domain([d.x0, d.x1]);
    y.domain([d.y0, d.y1]);

    svg.transition()
      .duration(750)
      .call(t => group0.transition(t).remove().call(position, d.parent))
      .call(t => group1.transition(t).attrTween("opacity", () => d3.interpolate(0, 1)).call(position, d));
  }

  function zoomout(d) {
    const group0 = group.attr("pointer-events", "none");
    const group1 = group = svg.insert("g", "*").call(render, d.parent);

    x.domain([d.parent.x0, d.parent.x1]);
    y.domain([d.parent.y0, d.parent.y1]);

    svg.transition()
      .duration(750)
      .call(t => group0.transition(t).remove().attrTween("opacity", () => d3.interpolate(1, 0)).call(position, d))
      .call(t => group1.transition(t).call(position, d.parent));
  }

  document.getElementById("chart_mri").appendChild(svg.node());
}

// Load the JSON data file using D3.js and call renderChart function.
d3.json("json/mri_hierarchy.json").then(data => {
  renderChart(data);
});
