// Set up dimensions and margins
const width_med = 900;
const height_med = 600;

// Create SVG container
const svg_med = d3.select("#chart_med")
  .append("svg")
    .attr("width", width_med)
    .attr("height", height_med)
    .style("cursor", "pointer")
    .call(d3.zoom()
      .scaleExtent([0.5, 5]) // Set zoom range from 50% to 500%
      .on("zoom", zoomed)) // Call zoomed function on zoom event
    .on("dblclick.zoom", resetZoom); // Reset zoom on double-click anywhere

// Define the zoomed function to apply transformations
function zoomed(event) {
  g_med.attr("transform", event.transform);
}

// Define the reset zoom function to return to the initial state
function resetZoom() {
  svg_med.transition().duration(1000).ease(d3.easeCubic)
    .call(d3.zoom().transform, d3.zoomIdentity);
  d3.select("#details").html(""); // Clear drill-down details
}

// Add a group to hold the bubbles and apply transformations for zoom
const g_med = svg_med.append("g");

// Define colors for each availability category
const colorScale_med = d3.scaleOrdinal()
  .domain(["Very Low", "Low", "Medium", "High", "Very High"])
  .range(["#FFBC42", "#D81159", "#8F2D56", "#218380", "#73D2DE"]); // Vibrant colors for contrast

// Tooltip for interactivity (you can remove this if not needed)
const tooltip_med = d3.select("#tooltip_med");

// Load data
d3.csv("cleaned/OECD_MED_TECH_AVAIL.csv").then(data => {
  // Convert necessary fields to numbers
  data.forEach(d => {
    d.OBS_VALUE = +d.OBS_VALUE; // Use OBS_VALUE for bubble size
    d.Year = +d.Year;
  });

  // Populate the technology filter dropdown
  const uniqueTechnologies = [...new Set(data.map(d => d.Technology_Types))];
  const technologyFilter = d3.select("#technologyFilter");
  uniqueTechnologies.forEach(tech => {
    technologyFilter.append("option").text(tech).attr("value", tech);
  });

  // Set up the interactive year slider
  d3.select("#yearSlider_med").on("input", function() {
    const selectedYear = +this.value;
    updateChart(selectedYear, technologyFilter.node().value); // Update the chart based on the slider value
  });

  // Event listener for technology filter
  d3.select("#technologyFilter").on("change", function() {
    updateChart(yearSlider.value, this.value);
  });

  // Initial render of the chart
  updateChart(d3.max(data, d => d.Year), "All");

  // Function to update the chart based on selected year and technology
  function updateChart(year, technologyType) {
    let filteredData = data.filter(d => d.Year === year);
    if (technologyType !== "All") {
      filteredData = filteredData.filter(d => d.Technology_Types === technologyType);
    }

    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(filteredData, d => d.OBS_VALUE)])
      .range([5, 40]);

    const bubbles = g_med.selectAll("circle")
      .data(filteredData, d => d.id);

    bubbles.exit().remove();

    const bubblesEnter = bubbles.enter().append("circle")
      .attr("class", d => `bubble bubble-${d.Availability_Category}`)
      .attr("r", 0)
      .attr("fill", d => colorScale_med(d.Availability_Category))
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1)
      .on("mouseover", function(event, d) {
        // Enlarge and increase opacity on hover
        d3.select(this)
          .transition().duration(200)
          .attr("r", d => radiusScale(d.OBS_VALUE) * 1.2) // Enlarge by 20%
          .attr("opacity", 0.8);
      })
      .on("mouseout", function() {
        // Reset size and opacity when not hovering
        d3.select(this)
          .transition().duration(200)
          .attr("r", d => radiusScale(d.OBS_VALUE)) // Reset to original size
          .attr("opacity", 1); // Reset opacity
      })
      .on("click", function(event, d) {
        drillDown(d);
      });

    bubblesEnter.merge(bubbles)
      .transition().duration(1000).ease(d3.easeCubicOut)
      .attr("r", d => radiusScale(d.OBS_VALUE))
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
    
    // Update simulation
    const simulation = d3.forceSimulation(filteredData)
      .force("x", d3.forceX(width_med / 2).strength(0.05))
      .force("y", d3.forceY(height_med / 2).strength(0.05))
      .force("collide", d3.forceCollide(d => radiusScale(d.OBS_VALUE) + 1))
      .alphaDecay(0.05)
      .on("tick", () => {
        bubblesEnter.merge(bubbles)
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
      });
  }

  // Drill-down function to show more details on click
  function drillDown(dataPoint) {
    // Display details about the clicked bubble
    d3.select("#details").html(`
      <h3>Details for ${dataPoint.Country}</h3>
      <p><strong>Technology:</strong> ${dataPoint.Technology_Types}</p>
      <p><strong>Availability Category:</strong> ${dataPoint.Availability_Category}</p>
      <p><strong>Year:</strong> ${dataPoint.Year}</p>
      <p><strong>Value:</strong> ${dataPoint.OBS_VALUE}</p>
    `);

    // Create zoom transformation centered on the clicked bubble
    const transform = d3.zoomIdentity
      .translate(width_med / 2, height_med / 2)
      .scale(2) // Zoom level
      .translate(-dataPoint.x, -dataPoint.y);
    
    // Apply the zoom transformation with a smooth transition
    svg_med.transition().duration(1000).ease(d3.easeCubic)
      .call(d3.zoom().transform, transform);
  }
});
