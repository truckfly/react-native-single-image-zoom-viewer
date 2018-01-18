/**
 * Created by liuyiman on 2017/8/7.
 *
 * 使用
 */

import {View, Image, StyleSheet, Dimensions, PanResponder} from "react-native";

import React from "react";

class SingleImageZoomViewer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isFromUri: false,
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            scale: 1,
        };
        this.center = this.center.bind(this);
        this._isZooming = false;
        this.windowWidth = Dimensions.get("window").width;
        this.windowHeight = Dimensions.get("window").height;
    }
    /*
    * center and zoom to fit the window
    * @ _width: the picture width
    * @ _height: the picture height
    * */
    center(_width, _height) {
        let {width, height} = Dimensions.get("window"),
            rateImage = _width / _height,
            rateWindow = width / height,
            top,
            left,
            scale;
        if (rateImage > rateWindow) {
            scale = width / _width;
        } else {
            scale = height / _height;
        }
        top = (height - _height) / 2;
        left = (width - _width) / 2;
        this.setState({
            left,
            top,
            width: _width,
            height: _height,
            scale,
            rate: scale,
        });
    }

    // ensures that the image cannot be transformed past its dimensions
    handleOverflowDimension(axis, moveAmount, imageDim, screenDim) {
        let position = 0,
            scale = this.state.scale;
        switch (axis) {
            case "x":
                position = this.state.left;
                break;
            case "y":
                position = this.state.top;
                break;
        }

        if (
            (moveAmount !== 0 && screenDim > imageDim * scale) ||
            (moveAmount > 0 &&
                position + (screenDim - imageDim * scale) / 2 >= (screenDim - imageDim) / 2) ||
            (moveAmount < 0 &&
                position - (screenDim - imageDim * scale) / 2 < (screenDim - imageDim) / 2)
        ) {
            moveAmount = 0;
        }
        return moveAmount;
    }

    componentWillMount() {
        // different image source deal in different way
        if (this.props.source.uri === undefined) {
            this.center(this.props.width || 200, this.props.height || 200);
        } else {
            Image.getSize(
                this.props.source.uri,
                (width, height) => {
                    this.center(width, height);
                },
                error => {
                    console.error(error);
                }
            );
        }
        // gesture handler
        this._touches = [{}, {}];
        this._zoom = undefined;
        this._panResponder = PanResponder.create({
            // be the responder
            onStartShouldSetResponder: (evt, gestureState) => true,
            onStartShouldSetResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,

            // touche start
            onPanResponderGrant: (evt, gestureState) => {
                // mark touches info
                for (let x in this._touches) {
                    if (evt.nativeEvent.touches[x]) {
                        this._touches[x].x = evt.nativeEvent.touches[x].pageX;
                        this._touches[x].y = evt.nativeEvent.touches[x].pageY;
                        this._touches[x].identifier = evt.nativeEvent.touches[x].identifier;
                    }
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                if (evt.nativeEvent.touches.length === 1) {
                    if (this._isZooming) {
                        // We don't want to move the image when the user is zooming
                        return false;
                    }
                    // one finger, moving
                    // reset zoom msg
                    // todo possibly the lest finger is not the first touches,deal with it
                    if (this._touches[0].identifier === undefined) {
                        //haven marked before, mark and return
                        for (let x in this._touches) {
                            if (evt.nativeEvent.touches[x]) {
                                this._touches[x].x = evt.nativeEvent.touches[x].pageX;
                                this._touches[x].y = evt.nativeEvent.touches[x].pageY;
                                this._touches[x].identifier =
                                    evt.nativeEvent.touches[x].identifier;
                            }
                        }
                        return false;
                    } else {
                        // compute the distance has touch moved
                        let moveX = evt.nativeEvent.touches[0].pageX - this._touches[0].x;
                        let moveY = evt.nativeEvent.touches[0].pageY - this._touches[0].y;

                        moveX = this.handleOverflowDimension(
                            "x",
                            moveX,
                            this.state.width,
                            this.windowWidth
                        );

                        moveY = this.handleOverflowDimension(
                            "y",
                            moveY,
                            this.state.height,
                            this.windowWidth
                        );

                        this.setState({
                            left: this.state.left + moveX,
                            top: this.state.top + moveY,
                        });
                        // mark
                        for (let x in this._touches) {
                            if (evt.nativeEvent.touches[x]) {
                                this._touches[x].x = evt.nativeEvent.touches[x].pageX;
                                this._touches[x].y = evt.nativeEvent.touches[x].pageY;
                                this._touches[x].identifier =
                                    evt.nativeEvent.touches[x].identifier;
                            }
                        }
                    }
                } else {
                    this._isZooming = true;
                    // compute the zoom center
                    if (this._zoom === undefined) {
                        // mark the zoom center
                        this._zoom = {
                            x:
                                (evt.nativeEvent.touches[0].pageX +
                                    evt.nativeEvent.touches[1].pageX) /
                                2,
                            y:
                                (evt.nativeEvent.touches[0].pageY +
                                    evt.nativeEvent.touches[1].pageY) /
                                2,
                            distance: Math.sqrt(
                                Math.pow(
                                    evt.nativeEvent.touches[0].pageX -
                                        evt.nativeEvent.touches[1].pageX,
                                    2
                                ) +
                                    Math.pow(
                                        evt.nativeEvent.touches[0].pageY -
                                            evt.nativeEvent.touches[1].pageY,
                                        2
                                    )
                            ),
                        };
                        return false;
                    } else {
                        // compute distance
                        let distanceTemp = Math.sqrt(
                            Math.pow(
                                evt.nativeEvent.touches[0].pageX -
                                    evt.nativeEvent.touches[1].pageX,
                                2
                            ) +
                                Math.pow(
                                    evt.nativeEvent.touches[0].pageY -
                                        evt.nativeEvent.touches[1].pageY,
                                    2
                                )
                        );
                        let distanceAdd = distanceTemp - this._zoom.distance;
                        let distanceScale = distanceAdd / this._zoom.distance;
                        // compute scale
                        let scaleAdd = 0;
                        if (distanceScale === 0) {
                            // do nothing
                        } else {
                            scaleAdd = this.state.scale * distanceScale;
                        }
                        let computedScale = this.state.scale + scaleAdd;

                        // compute left & top for centering the zoom point
                        let computedLeft =
                            computedScale /
                                this.state.scale *
                                (0.5 * this.state.width + this.state.left - this._zoom.x) -
                            0.5 * this.state.width +
                            this._zoom.x;
                        let computedTop =
                            computedScale /
                                this.state.scale *
                                (0.5 * this.state.height + this.state.top - this._zoom.y) -
                            0.5 * this.state.height +
                            this._zoom.y;

                        this.setState({
                            left: computedLeft,
                            top: computedTop,
                        });

                        // will not zoom out further than image width / height
                        let width = this.windowWidth,
                            height = this.windowHeight,
                            _width = this.state.width,
                            _height = this.state.height;
                        if (
                            (scaleAdd < 0 &&
                                (_width >= _height &&
                                    (computedLeft + (width - _width * computedScale) / 2 >
                                        (width - _width) / 2 ||
                                        computedLeft - (width - _width * computedScale) / 2 <
                                            (width - _width) / 2))) ||
                            (_width < _height &&
                                (computedTop + (height - _height * computedScale) / 2 >
                                    (height - _height) / 2 ||
                                    computedTop - (height - _height * computedScale) / 2 <
                                        (height - _height) / 2))
                        ) {
                            return false;
                        }

                        this._zoom.distance = distanceTemp;

                        this.setState({
                            scale: computedScale,
                        });
                    }
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                // reset
                this._touches = [{}, {}];
                this._zoom = undefined;
                this._isZooming = false;
            },
        });
    }

    render() {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: "black",
                    ...this.props.style,
                }}
            >
                <Image
                    source={this.props.source}
                    style={{
                        position: "absolute",
                        width: this.state.width,
                        height: this.state.height,
                        left: this.state.left,
                        top: this.state.top,
                        transform: [
                            {
                                scale: this.state.scale,
                            },
                        ],
                    }}
                    {...this._panResponder.panHandlers}
                />
            </View>
        );
    }
}

export default SingleImageZoomViewer;
