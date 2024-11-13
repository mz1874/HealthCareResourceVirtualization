// Set up dimensions and margins 
const width_med = 900;
const height_med = 600;

// Create SVG container
const svg_med = d3.select("#chart_med")
  .append("svg")
  .attr("width", width_med)
  .attr("height", height_med)
  .style("cursor", "pointer");

// Add a group to hold the bubbles and apply transformations for zoom
const g_med = svg_med.append("g");

// Define colors for each availability category
const colorScale_med = d3.scaleOrdinal()
  .domain(["Very Low", "Low", "Medium", "High", "Very High"])
  .range(["#FFBC42", "#D81159", "#8F2D56", "#218380", "#73D2DE"]); // Vibrant colors for contrast

// Tooltip for interactivity (optional)
const tooltip_med = d3.select("#tooltip_med");

// Load data
d3.csv("cleaned/OECD_MED_TECH_AVAIL.csv").then(data => {
  // Convert necessary fields to numbers
  data.forEach(d => {
    d.OBS_VALUE = +d.OBS_VALUE; // Use OBS_VALUE for bubble size
    d.Year = +d.Year;
    d.id = `${d.Country}-${d.Technology_Types}-${d.Year}`; // Unique id for each bubble
  });

  // Variables to store the current year and technology type
  const minYear = d3.min(data, d => d.Year); // Get the minimum year in the dataset
  let currentYear = minYear; // Start with the minimum year
  let currentTechnologyType = "All";

  // Populate the technology filter dropdown
  const uniqueTechnologies = [...new Set(data.map(d => d.Technology_Types))];
  const technologyFilter = d3.select("#technologyFilter");
  uniqueTechnologies.forEach(tech => {
    technologyFilter.append("option").text(tech).attr("value", tech);
  });

  // Set the initial year slider value to the minimum year and update chart
  d3.select("#yearSlider_med")
    .attr("min", minYear)
    .attr("max", d3.max(data, d => d.Year))
    .attr("value", minYear)
    .on("input", function() {
      currentYear = +this.value;
      resetZoom(); // Reset zoom before updating chart
      updateChart(currentYear, currentTechnologyType);
    });

  d3.select("#technologyFilter").on("change", function() {
    currentTechnologyType = this.value;
    resetZoom(); // Reset zoom before updating chart
    updateChart(currentYear, currentTechnologyType);
  });

  // Initial render of the chart with minimum year and "All" technology types
  updateChart(currentYear, currentTechnologyType);

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
      .attr("r", d => radiusScale(d.OBS_VALUE))
      .attr("fill", d => colorScale_med(d.Availability_Category))
      .attr("stroke", "#000")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition().duration(200)
          .attr("r", d => radiusScale(d.OBS_VALUE) * 1.2) // Enlarge by 20%
          .attr("opacity", 0.8);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition().duration(200)
          .attr("r", d => radiusScale(d.OBS_VALUE)) // Reset to original size
          .attr("opacity", 1); // Reset opacity
      })
      .on("click", function(event, d) {
        drillDown(d);
        transitionZoom(d); // Smooth zoom on single click
      })
      .on("dblclick", function() {
        resetZoom(); // Reset zoom on double-click
      });

    bubblesEnter.merge(bubbles)
      .transition().duration(1000).ease(d3.easeCubicOut)
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

  // Smooth zoom transition function
  function transitionZoom(d) {
    const radius = 40; // The zoom radius (adjustable)
    const i = d3.interpolateZoom([width_med / 2, height_med / 2, height_med], [d.x, d.y, radius * 2 + 1]);

    g_med.transition()
      .duration(i.duration)
      .attrTween("transform", () => t => `
        translate(${width_med / 2}, ${height_med / 2})
        scale(${height_med / i(t)[2]})
        translate(${-i(t)[0]}, ${-i(t)[1]})
      `);
  }

  // Reset zoom function to return to original view
  function resetZoom() {
    g_med.transition()
      .duration(1000)
      .attr("transform", `translate(0,0) scale(1)`);
  }

  // Drill-down function to show more details on click
  function drillDown(dataPoint) {
    let description = "";

    switch (dataPoint.Technology_Types) {
      case "Computed Tomography scanners":
        description = "Computed tomography, or CT scan, uses X-rays and computer technology to produce images of internal body parts, showing bones, organs, and blood vessels.";
        break;
      case "Magnetic Resonance Imaging units":
        description = "MRI is a noninvasive imaging test that produces detailed images of organs, muscles, and blood vessels using a large magnet and radio waves.";
        break;
      case "Positron Emission Tomography (PET) scanners":
        description = "PET is a nuclear medicine procedure that measures the metabolic activity of cells in tissues, combining nuclear medicine with biochemical analysis.";
        break;
      case "Gamma cameras":
        description = "Gamma cameras are used in nuclear medicine imaging to capture functional images of organs and tissues by detecting gamma radiation.";
        break;
      case "Mammographs":
        description = "Mammography is an X-ray imaging method used to detect breast cancer and other abnormalities in breast tissue.";
        break;
      case "Radiation therapy equipment":
        description = "Radiation therapy equipment is used in oncology to treat cancer by delivering precise doses of radiation to cancerous tissues.";
        break;
      default:
        description = "Detailed information is currently unavailable.";
    }

    d3.select("#details").html(`
      <h3>Information for ${dataPoint.Country}</h3>
      <p><strong>Technology:</strong> ${dataPoint.Technology_Types}</p>
      <p><strong>Availability Category:</strong> ${dataPoint.Availability_Category}</p>
      <p><strong>Year:</strong> ${dataPoint.Year}</p>
      <p><strong>Value:</strong> ${dataPoint.OBS_VALUE}</p>
      <p><strong>Description:</strong> ${description}</p>
    `);
  }
});
