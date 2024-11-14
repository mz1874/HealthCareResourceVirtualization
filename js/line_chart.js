(async function() {
    // 加载和解析 CSV 数据
    const data = await d3.csv("cleaned/Health_employment_education(cleaned).csv", d3.autoType);

    // 提取唯一的国家名称并填充选择下拉框
    const countries = Array.from(new Set(data.map(d => d.Country))).sort();
    const select = d3.select("#country-select");
    countries.forEach(country => {
        select.append("option").text(country).attr("value", country);
    });

    // 定义 SVG 尺寸
    const width = 960;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };

    // 创建比例尺
    const x = d3.scaleLinear().range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);

    // 创建 SVG 容器
    const svg = d3.select("#line-chart")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

    // 添加 X 和 Y 轴组
    const xAxisGroup = svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`);
    const yAxisGroup = svg.append("g").attr("transform", `translate(${margin.left},0)`);

    // 定义线生成器
    const line = d3.line()
        .curve(d3.curveLinear) // 使用线性曲线生成器
        .x(d => x(d.TIME_PERIOD))
        .y(d => y(d.OBS_VALUE));

    // 提示框设置
    const tooltip = d3.select("#tooltip2");

    // 当选择国家时更新图表
    select.on("change", function() {
        const selectedCountry = this.value;
        updateChart(selectedCountry);
    });

    function updateChart(country) {
        // 清除现有的图例项
        d3.select("#legend").selectAll(".legend-item").remove();

        // 过滤选定国家的数据并确保没有缺失值
        const countryData = data.filter(d => d.Country === country && d.OBS_VALUE != null);

        // 按时间排序数据
        countryData.sort((a, b) => a.TIME_PERIOD - b.TIME_PERIOD);

        // 按变量分组数据
        const groupedData = d3.groups(countryData, d => d.Variable);

        // 创建基于唯一变量名称的颜色比例
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(groupedData.map(d => d[0])); // 使用唯一变量名称

        // 更新比例尺
        x.domain(d3.extent(countryData, d => d.TIME_PERIOD));
        y.domain([0, d3.max(countryData, d => d.OBS_VALUE)]).nice();

        // 更新 X 轴
        xAxisGroup.transition().call(d3.axisBottom(x).ticks(width / 80).tickFormat(d3.format("d")).tickSizeOuter(0));

        // 更新 Y 轴
        yAxisGroup.transition().call(d3.axisLeft(y)
            .ticks(5)
            .tickFormat(d => d.toFixed(0))
        ).call(g => g.select(".domain").remove());

        // 移除任何现有的 Y 轴标签并添加新的标签
        yAxisGroup.selectAll(".y-label").remove();
        yAxisGroup.append("text")
            .attr("class", "y-label")
            .attr("x", -margin.left + 5)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text("↑ Number of Physician");

        // 绑定并绘制每个变量类型的线条路径
        const paths = svg.selectAll(".line-path")
            .data(groupedData, d => d[0]); // 确保按变量名称唯一绑定

        paths.enter().append("path")
            .attr("class", "line-path")
            .attr("fill", "none")
            .attr("stroke", d => colorScale(d[0])) // 使用变量名称获取颜色
            .attr("stroke-width", 2)
            .merge(paths)
            .transition()
            .attr("d", ([, values]) => line(values));

        paths.exit().remove();

        // 添加数据点的圆圈
        const points = svg.selectAll(".data-point")
            .data(groupedData.flatMap(([type, values]) => values.map(d => ({ type, ...d }))), d => d.type + d.TIME_PERIOD);

        // 新的点进入
        points.enter().append("circle")
            .attr("class", "data-point")
            .attr("r", 4)
            .attr("fill", d => colorScale(d.type))
            .merge(points)
            .attr("cx", d => x(d.TIME_PERIOD))
            .attr("cy", d => y(d.OBS_VALUE))
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible")
                    .text(`${d.type}: ${d.OBS_VALUE}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("top", `${event.pageY -650}px`)
                    .style("left", `${event.pageX -300}px`);
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });


        points.exit().remove();

        // 生成图例
        const legendItems = d3.select("#legend").selectAll(".legend-item")
            .data(groupedData)
            .enter().append("div")
            .attr("class", "legend-item");

        legendItems.append("span")
            .attr("class", "legend-box")
            .style("background-color", d => colorScale(d[0]))
            .style("display", "inline-block")
            .style("width", "15px")
            .style("height", "15px")
            .style("margin-right", "5px")
            .style("cursor", "pointer")
            .on("click", function(event, d) {
                const isActive = d3.select(this).classed("active");
                d3.select(this).classed("active", !isActive);
                svg.selectAll(".line-path")
                    .filter(line => line[0] === d[0])
                    .style("display", isActive ? "none" : "block");
                svg.selectAll(".data-point")
                    .filter(point => point.type === d[0])
                    .style("display", isActive ? "none" : "block");
            });

        legendItems.append("span")
            .text(d => d[0])
            .style("vertical-align", "middle");
    }

    // 初始图表显示为列表中的第一个国家
    updateChart(countries[0]);
})();
