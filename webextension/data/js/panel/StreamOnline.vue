<template>
	<div :id="stream.streamWebsite + '/' + stream.streamId + '/' + stream.contentId"
	     :class="'item-stream cursor onlineItem' + (stream.withError? 'erroredItem' : '')" draggable="true" tabindex="0">

		<figure v-if="stream.hasOwnProperty('streamLogo') && !!stream.streamLogo" class="streamPicture">
			<img alt="" :src="streamLogo" />
		</figure>

		<div>
			<span class="streamTitle">
				<span v-if="stream.withError" class="erroredItem-icon"></span>
				{{stream.streamName}}
			</span>
			<span v-if="stream.streamCurrentViewers !== null" class="streamCurrentViewers" data-stream-current-viewers="{{stream.streamCurrentViewers}}"></span>
		</div>
		<div>
			<span class="streamStatus">{{stream.streamStatus}}</span>
			<span class="stream_control">
			<span class="deleteStreamButton" data-translate-title="Delete">delete</span>
			<span class="ignoreStreamButton" data-translate-title="IgnoreStream">visibility_off</span>
			<span v-if="!stream.unsupportedType && !!stream.streamURL" class="copyStreamURL" data-translate-title="copyURL"></span>
			<span class="editStreamButton" data-translate-title="Settings"></span>
			<span class="shareStreamButton" data-translate-title="shareStream"></span>
		</span>
		</div>
	</div>
</template>

<script>
	export default {
		name: "StreamOnline",
		props: ['stream']
	}
</script>
