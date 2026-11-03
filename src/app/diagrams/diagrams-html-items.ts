// A copy of the Diagrams defaults added to @tiptap-pro/client-ai-toolkit; drop it once a
// release includes them.
export const diagramsHtmlItems = [
  {
    extensionName: "chart",
    tag: "figure",
    name: "Chart",
    description: [
      "A chart drawn from the <table> inside the figure. The table is part of the chart: its first row names the columns, and the first cell of every other row names that row.",
      "The chart type decides how the rows are read:",
      "line, bar, area, scatter, combo and radar: a category per row and a column of numbers per series.",
      "pie, doughnut and funnel: a category per row and one column of numbers, the parts of a whole. A funnel lists stages, widest first.",
      "gauge: one row with one number.",
      'treemap and tree: the first cell is a path, "Europe / Germany" places Germany under Europe, then one number.',
      "sankey and network: one row per link: where it starts, where it ends, and its value.",
      "matrix: a grid of words, such as a RACI matrix: tasks in the first column, a column per role, R, A, C or I in the cells.",
      "Numbers use a dot for decimals. The title is in data-tt-chart-spec, not in a <figcaption>.",
      'Write a new chart as a figure with data-type="chart", a data-tt-chart-spec attribute and a <table>.',
      "When you change a chart, write the whole figure again and keep each attribute, element and spec field you do not change.",
      "data-tt-chart-type only repeats the type: change the type in data-tt-chart-spec.",
      "Never add data-tt-chart-link or an <img>.",
      'While the mode in data-tt-chart-link is "linked", the chart reads its data from there: leave its table as it is.',
      'When its provider is "document-table", the chart follows the <table> whose data-tt-chart-table-id its address names: change that table instead, and keep its data-tt-chart-table-id.',
      "For a process or a flow, use a diagram instead.",
    ].join(" "),
    attributes: [
      {
        attr: "data-type",
        value: "chart",
        description: "Identifies this element as a chart",
      },
      {
        attr: "data-tt-chart-spec",
        description: [
          "JSON with the chart settings. Only type is required: line, bar, area, scatter, pie, doughnut, matrix, radar, funnel, gauge, treemap, combo, tree, sankey, network, or one the editor registered.",
          "Other fields: title;",
          "description (alt text);",
          "caption (true shows the description below the chart);",
          "legend {show, position: top, right, bottom or left};",
          "palette (CSS colors, one per series);",
          "background (a CSS color);",
          "border (true frames the chart);",
          "style (a registered style id);",
          "stacked (true stacks bars and areas);",
          'orientation ("horizontal" lays the bars of a bar or combo chart on their side);',
          "innerRadius (the hole of a doughnut, 0 to 0.9 of the radius);",
          "range {min, max} (the scale of a gauge, 0 to 100 by default);",
          "series {[columnId]: {line, width, marker, smooth, as, axis}} (line: solid, dashed or dotted; marker: none, circle or square; for a combo chart, as: bar or line, and axis: right for a second value axis);",
          "axes {x, y} (x the category axis, y the value axis, each {title, min, max, step, grid, line}, with grid and line as {line: none, solid, dashed or dotted, width, color});",
          "references [{value, or from and to, label, color, line}] (lines and bands at values, such as a target);",
          "encoding {label, series, seriesIn: columns or rows} (which columns are drawn, by column id);",
          "size {width, ratio, locked, align} (width 0.1 to 1 of the column, ratio width divided by height).",
          'A column id is its header in lowercase, with a - for each run of other characters, such as q1-sales for "Q1 Sales".',
          "Keep hidden, renderer and the fields you do not change.",
        ].join(" "),
      },
    ],
  },

  {
    extensionName: "flowDiagram",
    tag: "figure",
    name: "Diagram",
    description: [
      "A diagram drawn from the source in the <pre><code> inside the figure.",
      "Write Mermaid: the first line of the source names the kind, such as flowchart, sequenceDiagram, stateDiagram-v2, classDiagram, erDiagram, journey, gantt, mindmap, timeline, quadrantChart, gitGraph, kanban, architecture-beta, block-beta, C4Context or requirementDiagram.",
      "No %%{init}%% directives and no frontmatter. A <figcaption> after the <pre> is the title.",
      'Write a new diagram as a figure with data-type="flow-diagram" and the source in <pre><code>.',
      "When you change a diagram, write the whole figure again and keep each attribute you do not change, such as data-tt-flow-diagram-view and data-tt-flow-diagram-options.",
      "Keep the source of a drawio or bpmn diagram as it is.",
      "When data-tt-flow-diagram-options has a link, the diagram is drawn from the <table> whose data-tt-chart-table-id the link names: change that table instead.",
      "For a pie, xychart, sankey, radar or treemap, use a chart instead.",
    ].join(" "),
    attributes: [
      {
        attr: "data-type",
        value: "flow-diagram",
        description: "Identifies this element as a diagram",
      },
      {
        attr: "data-tt-flow-diagram-format",
        isOptional: true,
        description:
          "mermaid (the default), drawio, bpmn, or a format the editor registered",
      },
      {
        attr: "data-tt-flow-diagram-description",
        isOptional: true,
        description: "Text for readers who cannot see the picture",
      },
      {
        attr: "data-tt-flow-diagram-view",
        isOptional: true,
        description: "code shows the source instead of the drawn diagram",
      },
      {
        attr: "data-tt-flow-diagram-options",
        isOptional: true,
        description:
          "JSON with settings beyond the source: size {width, ratio, locked, align} (width 0.1 to 1 of the column, ratio width divided by height), the table link, and the offsets of shapes a user moved. Keep the keys you do not change.",
      },
    ],
  },
];
