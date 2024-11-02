const width = 960;
const height = 600;
let rotation = [260, -35];
let currentScale = 300;

const projection = d3.geoOrthographic()
    .scale(currentScale)
    .translate([width / 2, height / 2])
    .clipAngle(90);

const path = d3.geoPath().projection(projection);
const svg = d3.select("svg");
const tooltip = d3.select("#tooltip");

const yearsDropdown = d3.select("body")
    .append("select")
    .attr("id", "year-select")
    .style("position", "absolute")
    .style("top", "10px")
    .style("left", "10px");

let dataByCountryAndYear = {};
let totalOBSByCountry = {}; // 存储每个国家的 OBS_VALUE 总和

// 加载 CSV 数据
d3.csv("cleaned/Health_employment_education(cleaned).csv").then(data => {
    data.forEach(d => {
        const country = d.Country;
        const year = d.TIME_PERIOD;
        const obsValue = +d.OBS_VALUE; // 将 OBS_VALUE 转换为数字

        if (!dataByCountryAndYear[country]) {
            dataByCountryAndYear[country] = {};
        }
        if (!dataByCountryAndYear[country][year]) {
            dataByCountryAndYear[country][year] = [];
        }
        dataByCountryAndYear[country][year].push({
            variable: d.Variable,
            value: obsValue
        });

        // 计算每个国家的 OBS_VALUE 总和
        if (!totalOBSByCountry[country]) {
            totalOBSByCountry[country] = {};
        }
        if (!totalOBSByCountry[country][year]) {
            totalOBSByCountry[country][year] = 0;
        }
        totalOBSByCountry[country][year] += obsValue;
    });

    const years = Array.from(new Set(data.map(d => d.TIME_PERIOD))).sort();
    years.forEach(year => {
        yearsDropdown.append("option").attr("value", year).text(year);
    });

    // 定义 OBS_VALUE 总和的颜色比例尺
    const colorScale = d3.scaleThreshold()
        .domain([0, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 5000000]) // 增加的刻度
        .range(["#f7f7f7", "#fee8c8", "#fdbb84", "#fc8d59", "#e34a33", "#b30000", "#67000d", "#ffcc00", "#ffa500", "#ff0000"]); // 增加的颜色渐变

    // 加载 GeoJSON 并绘制地图
    d3.json("json/world-geojson.json").then(function(worldData) {
        g.selectAll("path.land")
            .data(worldData.features)
            .enter()
            .append("path")
            .attr("class", "land")
            .attr("d", path)
            .attr("fill", d => {
                const country = d.properties.name;
                const obsTotal = totalOBSByCountry[country]?.[years[0]] || 0; // 默认使用第一个年份
                return colorScale(obsTotal);
            })
            .on("click", clicked)
            .on("mouseover", mouseOver)
            .on("mousemove", mouseMove)
            .on("mouseout", mouseOut);
    });

    // 年份变化时更新颜色
    yearsDropdown.on("change", function() {
        const selectedYear = this.value;
        console.log(`当前年份: ${selectedYear}`);

        // 重新计算该年份的最大值，以动态更新颜色比例尺
        const obsValuesForYear = Object.values(totalOBSByCountry).map(countryData => countryData[selectedYear] || 0);
        const maxObsValue = d3.max(obsValuesForYear);

        // 更新颜色比例尺的域
        colorScale.domain([0, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, maxObsValue]);

        g.selectAll("path.land")
            .attr("fill", d => {
                const country = d.properties.name;
                const obsTotal = totalOBSByCountry[country]?.[selectedYear] || 0; // 使用可选链避免未定义错误
                console.log(`在 ${selectedYear} 年 ${country} 的总 OBS: ${obsTotal}`);
                return colorScale(obsTotal);
            });
    });
});

// 创建 SVG 容器和拖拽/缩放功能
const g = svg.append("g");

g.append("path")
    .attr("class", "ocean")
    .attr("d", path({type: "Sphere"}));

const drag = d3.drag().on("drag", function(event) {
    const dx = event.dx;
    const dy = event.dy;
    rotation[0] += dx * 0.5;
    rotation[1] -= dy * 0.5;
    projection.rotate(rotation);
    update();
});

svg.call(drag);



const zoom = d3.zoom()
    .scaleExtent([100, 800])
    .on("zoom", function(event) {
        // 获取当前缩放比例
        const newScale = event.transform.k;

        // 更新 currentScale
        currentScale = newScale;

        // 更新投影缩放
        projection.scale(currentScale);

        // 更新地图
        update();
    });

// 绑定缩放行为到 SVG 元素
svg.call(zoom);

// 设定初始缩放比例
svg.call(zoom.transform, d3.zoomIdentity.scale(currentScale));



function clicked(event, d) {
    const selectedCountry = d.properties.name;
    const selectedYear = yearsDropdown.node().value;
    const countryData = dataByCountryAndYear[selectedCountry]?.[selectedYear];

    g.selectAll("path.land").classed("selected", false);
    d3.select(event.currentTarget).classed("selected", true);

    // Check if valid data exists
    if (countryData) {
        // Filter non-zero OBS_VALUE and limit to the first 5 entries
        const nonZeroData = countryData.filter(item => item.value > 0).slice(0, 20);

        // Display tooltip only if there is data
        if (nonZeroData.length > 0) {
            const details = nonZeroData.map(item => `${item.variable}: ${item.value}`).join("<br>");
            tooltip.style("opacity", 1)
                .html(`<strong>${selectedCountry}</strong><br><strong>Year: ${selectedYear}</strong><br>${details}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 80) + "px");
        } else {
            // Hide tooltip if there's no valid data
            tooltip.style("opacity", 0);
        }
    } else {
        tooltip.style("opacity", 1)
            .html(`<strong>${selectedCountry}</strong><br><strong>Year: ${selectedYear}</strong><br>No data`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 40) + "px");
    }
}


// 提示框悬停函数
function mouseOver(event, d) {
    tooltip.style("opacity", 1)
        .html(d.properties.name);
}

function mouseMove(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
}

function mouseOut() {
    tooltip.style("opacity", 0);
}

d3.select("#zoom-in").on("click", function() {
    currentScale *= 1.2;
    projection.scale(currentScale);
    update();
});

d3.select("#zoom-out").on("click", function() {
    currentScale *= 0.8;
    projection.scale(currentScale);
    update();
});

function update() {
    g.selectAll("path.land").attr("d", path);
    g.selectAll("path.ocean").attr("d", path({type: "Sphere"}));
}

projection.rotate(rotation);
update();
