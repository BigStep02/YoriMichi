package com.framezero.restaurant.client.response;

import java.util.List;

public record NearbySearchResponse(List<PlaceResult> places) {}