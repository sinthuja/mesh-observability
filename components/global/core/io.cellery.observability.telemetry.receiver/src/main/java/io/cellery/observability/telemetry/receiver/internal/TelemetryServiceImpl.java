/*
 *  Copyright (c) 2018 WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 *
 */

package io.cellery.observability.telemetry.receiver.internal;

import io.cellery.observability.telemetry.receiver.AttributesBag;
import io.cellery.observability.telemetry.receiver.Constants;
import io.cellery.observability.telemetry.receiver.generated.AttributesOuterClass;
import io.cellery.observability.telemetry.receiver.generated.MixerGrpc;
import io.cellery.observability.telemetry.receiver.generated.Report;
import io.grpc.stub.StreamObserver;
import org.apache.log4j.Logger;
import org.wso2.siddhi.core.stream.input.source.SourceEventListener;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Telemetry Service implementation which receives the information.
 */
public class TelemetryServiceImpl extends MixerGrpc.MixerImplBase {
    private static final Logger log = Logger.getLogger(TelemetryServiceImpl.class.getName());

    private SourceEventListener sourceEventListener;

    public TelemetryServiceImpl(SourceEventListener sourceEventListener) {
        this.sourceEventListener = sourceEventListener;
    }

    @Override
    public void report(Report.ReportRequest request,
                       StreamObserver<Report.ReportResponse> responseObserver) {
        try {
            AttributedDecoder attributedDecoder = new AttributedDecoder(request);
            List<AttributesOuterClass.CompressedAttributes> attributesList = request.getAttributesList();

            for (AttributesOuterClass.CompressedAttributes attributes : attributesList) {
                attributedDecoder.setCurrentAttributes(attributes);
                AttributesBag attributesBag = new AttributesBag();

                attributes.getStrings().forEach((key, value) -> {
                    attributesBag.put(attributedDecoder.getValue(key), attributedDecoder.getValue(value));
                });

                attributes.getStringMaps().forEach((key, stringMap) -> {
                    Map<String, String> decodedStringMap = new HashMap<>();
                    stringMap.getEntries().forEach((stringMapKey, stringMapValue) -> {
                        decodedStringMap.put(attributedDecoder.getValue(stringMapKey),
                                attributedDecoder.getValue(stringMapValue));
                    });
                    attributesBag.put(attributedDecoder.getValue(key), decodedStringMap);
                });

                attributes.getBoolsMap().forEach((key, value) -> {
                    attributesBag.put(attributedDecoder.getValue(key), value);
                });

                attributes.getInt64SMap().forEach((key, value) -> {
                    attributesBag.put(attributedDecoder.getValue(key), value);
                });

                attributes.getDoublesMap().forEach((key, value) -> {
                    attributesBag.put(attributedDecoder.getValue(key), value);
                });

                attributes.getBytesMap().forEach((key, value) -> {
                    attributesBag.put(attributedDecoder.getValue(key), value);
                });

                attributes.getTimestampsMap().forEach((key, value) -> {
                    attributesBag.put(attributedDecoder.getValue(key), value);
                });

                attributes.getDurationsMap().forEach((key, value) -> {
                    attributesBag.put(attributedDecoder.getValue(key), value);
                });
                validateAttributes(attributesBag);
                sourceEventListener.onEvent(attributesBag.getAttributes(), new String[0]);
            }

            Report.ReportResponse reply = Report.ReportResponse.newBuilder().build();
            responseObserver.onNext(reply);
            responseObserver.onCompleted();
        } catch (Throwable throwable) {
            log.error("Error occured when receiving the event", throwable);
        }
    }

    private void validateAttributes(AttributesBag attributesBag) {
        String attributeName = "request.method";
        String headerKey = ":method";
        String attributeValue = validateAttribute(attributesBag, attributeName, true, headerKey,
                Constants.UNKNOWN_ATTRIBUTE);
        if (attributeValue != null) {
            attributesBag.put(attributeName, attributeValue);
        }

        attributeName = "response.code";
        headerKey = ":status";
        attributeValue = validateAttribute(attributesBag, attributeName, false, headerKey,
                "200");
        if (attributeValue != null) {
            attributesBag.put(attributeName, Long.parseLong(attributeValue));
        }

        attributeName = "request.useragent";
        headerKey = "user-agent";
        attributeValue = validateAttribute(attributesBag, attributeName, true, headerKey,
                Constants.UNKNOWN_ATTRIBUTE);
        if (attributeValue != null) {
            attributesBag.put(attributeName, attributeValue);
        }

        attributeName = "source.uid";
        headerKey = "user-agent";
        attributeValue = validateAttribute(attributesBag, attributeName, true, headerKey,
                Constants.UNKNOWN_ATTRIBUTE);
        if (attributeValue != null) {
            attributesBag.put(attributeName, attributeValue);
        }
    }

    private String validateAttribute(AttributesBag attributesBag, String attributeName, boolean isRequestHaeder,
                                     String headerKey, String defaultValue) {
        Object attribute = attributesBag.getAttributes().get(attributeName);
        if (attribute == null) {
            String headerValue;
            if (isRequestHaeder) {
                headerValue = attributesBag.getRequestHeaders().get(headerKey);
            } else {
                headerValue = attributesBag.getResponseHeaders().get(headerKey);
            }
            if (headerValue == null) {
                return defaultValue;
            }
            return headerValue;
        }
        return null;
    }
}
