/*
 * Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint max-len: ["off"] */

import "vis/dist/vis-network.min.css";
import ArrowRightAltSharp from "@material-ui/icons/ArrowRightAltSharp";
import Button from "@material-ui/core/Button";
import Constants from "../../../utils/constants";
import DependencyGraph from "../../common/DependencyGraph";
import Error from "@material-ui/icons/Error";
import Fade from "@material-ui/core/Fade";
import FiberManualRecord from "@material-ui/icons/FiberManualRecord";
import Paper from "@material-ui/core/Paper";
import Popper from "@material-ui/core/Popper";
import React from "react";
import Span from "../../../utils/tracing/span";
import TracingUtils from "../../../utils/tracing/tracingUtils";
import Typography from "@material-ui/core/Typography";
import {withStyles} from "@material-ui/core";
import withColor, {ColorGenerator} from "../../common/color";
import * as PropTypes from "prop-types";

const styles = (theme) => ({
    graph: {
        width: "100%",
        height: "100%"
    },
    btnLegend: {
        position: "sticky",
        bottom: 20,
        fontSize: 12,
        float: "right"
    },
    legendContent: {
        padding: theme.spacing.unit * 2
    },
    legendText: {
        display: "inline-flex",
        marginLeft: 5,
        fontSize: 12
    },
    legendHelpText: {
        display: "inline-flex",
        fontSize: 11,
        marginLeft: 5
    },
    legendIcon: {
        verticalAlign: "middle",
        marginLeft: 20
    },
    legendFirstEl: {
        verticalAlign: "middle"
    },
    graphContainer: {
        display: "flex",
        height: "75vh",
        width: "100%"
    },
    diagram: {
        padding: theme.spacing.unit * 3,
        flexGrow: 1
    }
});

class DependencyDiagram extends React.Component {

    static MIN_RADIUS = 60;
    static MAX_RADIUS = 120;
    static GLOBAL_GATEWAY = "global-gateway";

    constructor(props) {
        super(props);

        this.state = {
            legend: null,
            legendOpen: false
        };
    }

    handleClick = (event) => {
        const {currentTarget} = event;
        this.setState((state) => ({
            legend: currentTarget,
            legendOpen: !state.legendOpen
        }));
    };

    render = () => {
        const {classes, spans, colorGenerator} = this.props;
        const {legend, legendOpen} = this.state;
        const rootSpan = TracingUtils.getTreeRoot(spans);
        const id = legendOpen ? "legend-popper" : null;

        const nodeIdList = [];
        const nodes = [];
        const links = [];
        const getUniqueNodeId = (span) => (
            `${span.cell && span.cell.name ? `${span.cell.name}:` : ""}${span.serviceName}`
        );
        const addNodeIfNotPresent = (span) => {
            if (!nodeIdList.includes(getUniqueNodeId(span))) {
                // Finding the proper color for this item
                let colorKey = span.cell ? span.cell.name : null;
                if (!colorKey) {
                    if (span.componentType === Constants.CelleryType.SYSTEM) {
                        colorKey = ColorGenerator.SYSTEM;
                    } else {
                        colorKey = span.componentType;
                    }
                }
                const color = colorGenerator.getColor(colorKey);

                nodeIdList.push(getUniqueNodeId(span));
                nodes.push({
                    id: getUniqueNodeId(span),
                    color: color,
                    size: 350,
                    span: span
                });
            }
        };
        const addLink = (sourceSpan, destinationSpan) => {
            const link = {
                source: getUniqueNodeId(sourceSpan),
                target: getUniqueNodeId(destinationSpan)
            };
            if (sourceSpan.hasError() || destinationSpan.hasError()) {
                link.color = colorGenerator.getColor(ColorGenerator.ERROR);
            }
            links.push(link);
        };
        rootSpan.walk((span, data) => {
            let linkSource = data;
            if (!Constants.System.SIDECAR_AUTH_FILTER_OPERATION_NAME_PATTERN.test(span.operationName)
                && !Constants.System.ISTIO_MIXER_NAME_PATTERN.test(span.serviceName)) {
                if (linkSource && span.kind === Constants.Span.Kind.SERVER) { // Ending link traversing
                    addNodeIfNotPresent(span);
                    addLink(linkSource, span);
                    linkSource = null;
                } else if (!linkSource && span.kind === Constants.Span.Kind.CLIENT) { // Starting link traversing
                    addNodeIfNotPresent(span);
                    linkSource = span;
                }
            }
            return linkSource;
        }, null);

        let minDuration = Number.MAX_SAFE_INTEGER;
        let maxDuration = 0;
        for (const node of nodes) {
            if (node.span.duration < minDuration) {
                minDuration = node.span.duration;
            }
            if (node.span.duration > maxDuration) {
                maxDuration = node.span.duration;
            }
        }

        const viewGenerator = (nodeId, opacity) => {
            let color;
            if (nodeId === DependencyDiagram.GLOBAL_GATEWAY) {
                color = ColorGenerator.shadeColor(colorGenerator.getColor(ColorGenerator.SYSTEM), opacity);
            } else {
                color = ColorGenerator.shadeColor(colorGenerator.getColor(nodeId.split(":")[0]), opacity);
            }
            const outlineColor = ColorGenerator.shadeColor(color, -0.08);
            const errorColor = ColorGenerator.shadeColor(colorGenerator.getColor(ColorGenerator.ERROR), opacity);
            const component = [];
            nodes.forEach((node) => {
                if (node.id === nodeId) {
                    component.push(node);
                }
            });

            let radius;
            if (maxDuration === minDuration) {
                radius = DependencyDiagram.MAX_RADIUS;
            } else {
                radius = (((component[0].span.duration - minDuration)
                    * (DependencyDiagram.MAX_RADIUS - DependencyDiagram.MIN_RADIUS))
                    / (maxDuration - minDuration)) + DependencyDiagram.MIN_RADIUS;
            }

            let nodeView;
            if (component[0].span.hasError()) {
                const iconTranslation = radius * (Math.PI / 4);
                const xTranslation = 150;
                const yTranslation = 120 - iconTranslation - 30;

                nodeView = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="240px" height="240px" viewBox="0 0 240 240" style="enable-background:new 0 0 240 240" xmlSpace="preserve">'
                    + `<g><g><g><circle cx="120" cy="120" r="${radius - 3}" fill="${color}" stroke="${outlineColor}" stroke-width="5"/></g></g>`
                    + `<g transform="translate(${xTranslation},${yTranslation}) scale(0.35, 0.35)">`
                    + `<path stroke="#fff" strokeWidth="10" fill="${errorColor}" d="M120.5,9.6C59.1,9.6,9,59.8,9,121.3S59.1,233,120.5, 233S232,182.8,232,121.3S181.9,9.6,120.5,9.6z"/>`
                    + '<path fill="#ffffff" d="M105.4,164.5h29.9v29.9h-29.9V164.5z M105.4, 44.2h29.9v90.1h-29.9V44.2z"/></g></g>'
                    + "</svg>";
            } else {
                nodeView = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="240px" height="240px" viewBox="0 0 240 240" style="enable-background:new 0 0 240 240" xmlSpace="preserve">'
                    + `<circle cx="120" cy="120" r="${radius - 3}" fill="${color}" stroke="${outlineColor}" stroke-width="5"/>`
                    + "</svg>";
            }

            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(nodeView)}`;
        };

        return (
            nodes.length > 0
                ? (
                    <React.Fragment>
                        <div className={classes.graphContainer}>
                            <div className={classes.diagram}>
                                <DependencyGraph id="graph-id" nodeData={nodes} edgeData={links} graphType="trace-dependency"
                                    onClickNode={this.onClickCell} viewGenerator={viewGenerator}/>
                            </div>
                        </div>
                        <Button
                            aria-describedby={id}
                            variant="outlined"
                            className={classes.btnLegend}
                            onClick={this.handleClick}
                        >
                            Legend
                        </Button>
                        <Popper id={id} open={legendOpen} anchorEl={legend}
                            placement="top-end"
                            disablePortal={false}
                            transition>
                            {({TransitionProps}) => (
                                <Fade {...TransitionProps} timeout={350}>
                                    <Paper>
                                        <div className={classes.legendContent}>
                                            <div>
                                                <FiberManualRecord className={classes.legendFirstEl}
                                                    color="action"/>
                                                <Typography color="inherit"
                                                    className={classes.legendText}> Component/System
                                                    component </Typography>
                                                <Typography color="textSecondary"
                                                    className={classes.legendHelpText}> (Radius
                                                    proportional to the request duration)</Typography>
                                            </div>
                                            <div>
                                                <ArrowRightAltSharp className={classes.legendFirstEl}
                                                    color="action"/>
                                                <Typography color="inherit"
                                                    className={classes.legendText}> Dependency
                                                </Typography>
                                                <Error className={classes.legendIcon} color="error"/>
                                                <Typography color="inherit" className={classes.legendText}>
                                                    Error
                                                </Typography>
                                            </div>
                                        </div>
                                    </Paper>
                                </Fade>
                            )}
                        </Popper>
                    </React.Fragment>
                )
                : null
        );
    };

}

DependencyDiagram.propTypes = {
    classes: PropTypes.object.isRequired,
    spans: PropTypes.arrayOf(PropTypes.instanceOf(Span)).isRequired,
    colorGenerator: PropTypes.instanceOf(ColorGenerator).isRequired
};

export default withStyles(styles, {withTheme: true})(withColor(DependencyDiagram));
