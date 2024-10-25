// Set up the SVG dimensions
const svgWidth = 800, svgHeight = 400;
const margin = { top: 40, right: 20, bottom: 60, left: 60 };
const chartWidth = svgWidth - margin.left - margin.right;
const chartHeight = svgHeight - margin.top - margin.bottom;

// Create the SVG canvas
const svg = d3.select("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .style("background-color", "#ffffff") // White background for contrast
    .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.1)");

// Create the chart group
const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create a tooltip div that is hidden by default
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

// Create scales for x and y
let xScale = d3.scaleBand().range([0, chartWidth]).padding(0.3); // Use scaleBand for consistent spacing
let yScale = d3.scaleLinear().range([chartHeight, 0]);

// Create axes
const xAxis = chart.append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .attr("class", "axis");

const yAxis = chart.append("g")
    .attr("class", "axis");

// Add axis labels
svg.append("text")
    .attr("x", svgWidth / 2)
    .attr("y", svgHeight - 20)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Year");

svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -svgHeight / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("ICU Occupancy (%)");

// Load the CSV file
d3.csv("../cleaned/ICUBarChart.csv").then(function(data) {
    // Get unique countries for the dropdown
    const countries = Array.from(new Set(data.map(d => d['Reference area'])));

    // Populate the dropdown
    const dropdown = d3.select("#countryDropdown");
    dropdown.selectAll("option")
        .data(countries)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    // Sorting dropdown
    const sortDropdown = d3.select("#sortDropdown");

    // Initial country and sort order to display
    let selectedCountry = countries[0];
    let sortOrder = 'original'; // Default to chronological year order

    // Function to update the chart based on the selected country and sorting
    function updateChart() {
        // Filter the data for the selected country
        let countryData = data.filter(d => d['Reference area'] === selectedCountry);

        // Remove any data with missing ICU occupancy values
        countryData = countryData.filter(d => d.OBS_VALUE !== "");  // Exclude missing data

        // Sort the data based on the selected sorting order for occupancy (ascending/descending)
        if (sortOrder === 'ascending') {
            countryData.sort((a, b) => d3.ascending(+a.OBS_VALUE, +b.OBS_VALUE));
        } else if (sortOrder === 'descending') {
            countryData.sort((a, b) => d3.descending(+a.OBS_VALUE, +b.OBS_VALUE));
        } else {
            // Default sorting by year (natural order)
            countryData.sort((a, b) => d3.ascending(a.TIME_PERIOD, b.TIME_PERIOD));  // Default chronological sorting
        }

        // Update the scales
        xScale.domain(countryData.map(d => d.TIME_PERIOD)); // Map only the available years
        yScale.domain([0, d3.max(countryData, d => +d.OBS_VALUE)]);

        // Calculate bar width dynamically based on the number of data points
        const barCount = countryData.length;
        let barWidth = xScale.bandwidth(); // Default width from scaleBand
        if (barCount <= 4) {
            barWidth = Math.min(100, chartWidth / barCount - 20); // Increase width if fewer than 5 bars
        }

        // Bind data and create bars
        const bars = chart.selectAll(".bar")
            .data(countryData);

        // Enter selection: Create new bars for new data
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.TIME_PERIOD) + (xScale.bandwidth() - barWidth) / 2) // Adjust bar position based on custom width
            .attr("width", barWidth) // Set dynamic width
            .attr("y", chartHeight) // Start the bars from the bottom
            .attr("height", 0) // Initial height is zero for transition
            .merge(bars) // Merge new and existing bars for a smooth transition
            .transition() // Smooth transition for updates
            .duration(800)
            .attr("x", d => xScale(d.TIME_PERIOD) + (xScale.bandwidth() - barWidth) / 2) // Adjust bar position dynamically
            .attr("width", barWidth) // Dynamically adjust width for all bars
            .attr("y", d => yScale(+d.OBS_VALUE)) // Position the top of the bar correctly
            .attr("height", d => chartHeight - yScale(+d.OBS_VALUE)); // Update the height of the bar

        // Exit selection: Remove bars that no longer have corresponding data
        bars.exit()
            .transition() // Smooth exit transition
            .duration(500)
            .attr("y", chartHeight)
            .attr("height", 0)
            .remove();

        // Add interactivity (hover)
        chart.selectAll(".bar")
            .on("mouseover", function(event, d) {
                d3.select(this).transition()
                    .duration(200)
                    .attr("fill", "#FF7043") // Change color on hover
                    .attr("transform", "scale(1.05)"); // Slightly enlarge bar on hover

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`Year: ${d.TIME_PERIOD}<br>ICU Occupancy: ${d.OBS_VALUE}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).transition()
                    .duration(200)
                    .attr("fill", "#4CAF50") // Reset color
                    .attr("transform", "scale(1)"); // Reset size

                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Update the axes with smooth transitions
        xAxis.transition()
            .duration(800)
            .call(d3.axisBottom(xScale));

        yAxis.transition()
            .duration(800)
            .call(d3.axisLeft(yScale));
    }

    // Initially display the chart for the first country
    updateChart();

    // Update the chart when a new country is selected from the dropdown
    dropdown.on("change", function() {
        selectedCountry = this.value;
        sortOrder = 'original'; // Reset sorting to chronological when changing country
        updateChart();
    });

    // Update the chart when a new sorting option is selected
    sortDropdown.on("change", function() {
        sortOrder = this.value;
        updateChart();
    });
});
