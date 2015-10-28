/*****************************************************************************
 * Open MCT Web, Copyright (c) 2014-2015, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT Web is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT Web includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
/*global define,Promise,describe,it,expect,beforeEach,waitsFor,jasmine*/

define(
    ["../../src/controllers/DateTimeFieldController", "moment"],
    function (DateTimeFieldController, moment) {
        'use strict';

        var TEST_FORMAT = "YYYY-MM-DD HH:mm:ss";

        describe("The DateTimeFieldController", function () {
            var mockScope,
                mockFormatService,
                mockFormat,
                controller;

            function fireWatch(expr, value) {
                mockScope.$watch.calls.forEach(function (call) {
                    if (call.args[0] === expr) {
                        call.args[1](value);
                    }
                });
            }

            beforeEach(function () {
                mockScope = jasmine.createSpyObj('$scope', ['$watch']);
                mockFormatService =
                    jasmine.createSpyObj('formatService', ['getFormat']);
                mockFormat = jasmine.createSpyObj('format', [
                    'parse',
                    'validate',
                    'format'
                ]);

                mockFormatService.getFormat.andReturn(mockFormat);

                mockFormat.validate.andCallFake(function (text) {
                    return moment.utc(text, TEST_FORMAT).isValid();
                });
                mockFormat.parse.andCallFake(function (text) {
                    return moment.utc(text, TEST_FORMAT).valueOf();
                });
                mockFormat.format.andCallFake(function (value) {
                    return moment.utc(value).format(TEST_FORMAT);
                });

                mockScope.ngModel = { testField: 12321 };
                mockScope.field = "testField";
                mockScope.structure = { format: "someFormat" };

                controller = new DateTimeFieldController(
                    mockScope,
                    mockFormatService
                );
            });

            it("updates models from user-entered text", function () {
                var newText = "1977-05-25 17:30:00";

                mockScope.textValue = newText;
                fireWatch("textValue", newText);
                expect(mockScope.ngModel.testField)
                    .toEqual(mockFormat.parse(newText));
                expect(mockScope.textInvalid).toBeFalsy();
            });

            it("updates text from model values", function () {
                var testTime = mockFormat.parse("1977-05-25 17:30:00");
                mockScope.ngModel.testField = testTime;
                fireWatch("ngModel[field]", testTime);
                expect(mockScope.textValue).toEqual("1977-05-25 17:30:00");
            });

            describe("when user input is invalid", function () {
                var newText, oldValue;

                beforeEach(function () {
                    newText = "Not a date";
                    oldValue = mockScope.ngModel.testField;
                    mockScope.textValue = newText;
                    fireWatch("textValue", newText);
                });

                it("displays error state", function () {
                    expect(mockScope.textInvalid).toBeTruthy();
                });

                it("does not modify model state", function () {
                    expect(mockScope.ngModel.testField).toEqual(oldValue);
                });

                it("does not modify user input", function () {
                    expect(mockScope.textValue).toEqual(newText);
                });
            });

            it("does not modify valid but irregular user input", function () {
                // Don't want the controller "fixing" bad or
                // irregularly-formatted input out from under
                // the user's fingertips.
                var newText = "2015-3-3 01:02:04",
                    oldValue = mockScope.ngModel.testField;

                mockFormat.validate.andReturn(true);
                mockFormat.parse.andReturn(42);
                mockScope.textValue = newText;
                fireWatch("textValue", newText);

                expect(mockScope.textValue).toEqual(newText);
                expect(mockScope.ngModel.testField).toEqual(42);
                expect(mockScope.ngModel.testField).not.toEqual(oldValue);
            });

            it("obtains a format from the format service", function () {
                fireWatch('structure.format', mockScope.structure.format);
                expect(mockFormatService.getFormat)
                    .toHaveBeenCalledWith(mockScope.structure.format);
            });

            describe("using the obtained format", function () {
                var testValue = 1234321,
                    testText = "some text";

                beforeEach(function () {
                    mockFormat.validate.andReturn(true);
                    mockFormat.parse.andReturn(testValue);
                    mockFormat.format.andReturn(testText);
                });

                it("parses user input", function () {
                    var newText = "some other new text";
                    mockScope.textValue = newText;
                    fireWatch("textValue", newText);
                    expect(mockFormat.parse).toHaveBeenCalledWith(newText);
                    expect(mockScope.ngModel.testField).toEqual(testValue);
                });

                it("validates user input", function () {
                    var newText = "some other new text";
                    mockScope.textValue = newText;
                    fireWatch("textValue", newText);
                    expect(mockFormat.validate).toHaveBeenCalledWith(newText);
                });

                it("formats model data for display", function () {
                    var newValue = 42;
                    mockScope.ngModel.testField = newValue;
                    fireWatch("ngModel[field]", newValue);
                    expect(mockFormat.format).toHaveBeenCalledWith(newValue);
                    expect(mockScope.textValue).toEqual(testText);
                });
            });

        });
    }
);
