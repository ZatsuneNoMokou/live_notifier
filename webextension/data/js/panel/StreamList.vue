<template>
	<div id="streamListOnline">
		<div id="streamOnlineCountLabel"></div>
		<div v-if="groupWebsited === true" v-for="(websiteName, website) in websites" :class="website + 'group'">
			<StreamOnline v-for="stream in streamList" v-if="stream.website === websiteName && stream.online === true" :stream="stream" />
		</div>
		<div class="unsupported group"></div>


		<StreamOnline v-if="groupWebsited === false && stream.online === true" v-for="stream in streamList" :stream="stream" />
	</div>
	<div id="streamListOffline">
		<div id="streamOfflineCountLabel"></div>

		<div v-if="groupWebsited === true" v-for="(websiteName, website) in websites" :class="website + 'group'">
			<StreamOnline v-for="stream in streamList" v-if="stream.website === websiteName && stream.online === false" :stream="stream" />
		</div>
		<div class="unsupported group"></div>

		<StreamOffline v-if="groupWebsited === false && stream.online === false" v-for="stream in streamList" :stream="stream" />
	</div>
</template>

<script>
	export default {
		name: "StreamList",
		props: ['streamList', 'groupWebsited']
	}
</script>
