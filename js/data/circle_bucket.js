'use strict';

var ElementGroups = require('./element_groups');

module.exports = CircleBucket;

var PROPERTIES = [
    {
        styleName: 'circle-color',
        styleType: 'color',
        glName: 'a_color',
        glWidth: 4,
        glType: '4fv'
    },
    {
        styleName: 'circle-blur',
        styleType: 'number',
        glName: 'a_blur',
        glWidth: 1,
        glType: '1f'
    },
    {
        styleName: 'circle-radius',
        styleType: 'number',
        glName: 'a_size',
        glWidth: 1,
        glType: '1f'
    }
];

/**
 * A container for all circle data
 *
 * Circles are represented by two triangles.
 *
 * Each corner has a pos that is the center of the circle and an extrusion
 * vector that is where it points.
 */
function CircleBucket(buffers) {
    this.buffers = buffers;

}

CircleBucket.prototype.addFeatures = function() {

    var offsets = {};
    var partiallyEvaluated = {};
    var itemSize = 4; // 2 * sizeof(gl.SHORT)
    var layer = this.layers[0];

    for (var i = 0; i < PROPERTIES.length; i++) {
        var property = PROPERTIES[i];
        var declaration = this.layerPaintDeclarations[layer][property.styleName];
        if (declaration && !declaration.calculate.isFeatureConstant) {
            offsets[property.styleName] = itemSize;
            itemSize += 4;
            partiallyEvaluated[property.styleName] = declaration.calculate({$zoom: this.zoom});
        }
    }

    this.elementGroups = new ElementGroups(this.buffers.circleVertex, this.buffers.circleElement);
    this.elementGroups.itemSize = itemSize;
    this.buffers.circleVertex.itemSize = itemSize;
    this.buffers.circleVertex.alignInitialPos();
    this.elementGroups.offsets = offsets;

    var vertexIndex = this.buffers.circleVertex.index;
    for (i = 0; i < this.features.length; i++) {
        var geometries = this.features[i].loadGeometry()[0];
        for (var j = 0; j < geometries.length; j++) {
            this.elementGroups.makeRoomFor(6);
            var x = geometries[j].x;
            var y = geometries[j].y;

            var elementIndex = this.buffers.circleVertex.index - this.elementGroups.current.vertexStartIndex;

            // this geometry will be of the Point type, and we'll derive
            // two triangles from it.
            //
            // ┌─────────┐
            // │ 4     3 │
            // │         │
            // │ 1     2 │
            // └─────────┘
            //

            var extrudes = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

            for (var k = 0; k < extrudes.length; k++) {
                this.buffers.circleVertex.addPosition(vertexIndex, x, y, extrudes[k][0], extrudes[k][1]);
                for (var s = 0; s < PROPERTIES.length; s++) {
                    property = PROPERTIES[s];
                    if (offsets[property.styleName] !== undefined) {
                        this.buffers.circleVertex.add(
                            vertexIndex,
                            offsets[property.styleName],
                            property.styleType,
                            partiallyEvaluated[property.styleName](this.features[i].properties)
                        );
                    }
                }
                vertexIndex++;
            }

            // 1, 2, 3
            // 1, 4, 3
            this.elementGroups.elementBuffer.add(elementIndex, elementIndex + 1, elementIndex + 2);
            this.elementGroups.elementBuffer.add(elementIndex, elementIndex + 3, elementIndex + 2);

            this.elementGroups.current.vertexLength += 4;
            this.elementGroups.current.elementLength += 2;
        }
    }
};
